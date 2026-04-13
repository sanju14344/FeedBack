const { OpenAI } = require('openai');
const vader = require('vader-sentiment');
require('dotenv').config({ path: '../.env' });

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Local sentiment fallback
function analyzeSentimentLocal(text, starRatings = null) {
  let score = 0;
  if (starRatings && starRatings.length > 0) {
    const avg = starRatings.reduce((a, b) => a + b, 0) / starRatings.length;
    score = (avg - 3) / 2; // Map 1-5 to -1.0 to 1.0
  } else {
    const intensity = vader.SentimentIntensityAnalyzer.polarity_scores(text);
    score = intensity.compound;
  }
  
  let label = "Neutral";
  if (score >= 0.2) label = "Positive";
  else if (score <= -0.2) label = "Negative";

  return { label, score };
}

exports.analyzeSingleFeedback = async (text, starRatings) => {
  try {
    const avgStars = starRatings ? (starRatings.reduce((a,b) => a+b,0) / starRatings.length).toFixed(1) : null;
    const starLine = avgStars ? `Average star rating: ${avgStars}/5\n` : '';
    
    const prompt = `You are an expert educational feedback analyst.
Analyze the following student feedback about a teacher/subject.
IMPORTANT: Comments and written notes carry MORE weight than star ratings.
${starLine}
Feedback:
${text}

Respond ONLY with a valid JSON object with exactly these keys:
{"label": "Positive" | "Neutral" | "Negative", "score": <float -1.0 to 1.0>, "reason": "<one sentence explanation>"}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a precise educational sentiment analyst. Always respond in valid JSON only." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 120,
    });

    const result = JSON.parse(response.choices[0].message.content);
    let label = result.label;
    if (!["Positive", "Neutral", "Negative"].includes(label)) label = "Neutral";
    
    return {
      label,
      score: Math.max(-1, Math.min(1, result.score)),
      reason: result.reason
    };
  } catch (error) {
    console.error("OpenAI single analysis failed:", error.message);
    return analyzeSentimentLocal(text, starRatings);
  }
};

exports.generateClassInsights = async (feedbackList) => {
  if (!feedbackList || feedbackList.length === 0) {
    return { count: 0, ai_powered: false };
  }

  // Cap at 40
  const limited = feedbackList.slice(0, 40);
  const lines = limited.map((f, i) => `[${i+1}] ${f.feedback_text}`);
  const feedbackDump = lines.join('\n');
  
  const prompt = `You are an expert college educational analyst. Below are student feedback entries.
Analyze ALL feedback and produce a JSON response with exactly these keys:
{
  "overall_sentiment": "Positive" | "Neutral" | "Negative",
  "summary": "<2-3 sentence overall class feedback summary>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "areas_for_improvement": ["<area 1>", "<area 2>", "<area 3>"],
  "suggestions": ["<actionable suggestion for teacher 1>", "<suggestion 2>"],
  "top_compliments": ["<phrase>", "<phrase>"],
  "top_complaints": ["<phrase>", "<phrase>"]
}

Feedback entries:
${feedbackDump}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a precise educational feedback analyst. Respond only in valid JSON." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 600
    });

    const result = JSON.parse(response.choices[0].message.content);
    // Calc satisfaction
    const scores = feedbackList.map(f => f.sentiment_score || 0);
    const avg = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
    const satisfaction = Math.round(((avg + 1) / 2) * 100);

    return {
      ai_powered: true,
      satisfaction_score: satisfaction,
      raw_avg_score: avg,
      count: feedbackList.length,
      ai_summary: result.summary,
      ai_strengths: result.strengths || [],
      ai_improvements: result.areas_for_improvement || [],
      ai_suggestions: result.suggestions || [],
      ai_overall: result.overall_sentiment || "Neutral",
      top_compliment_phrases: result.top_compliments || [],
      top_complaint_phrases: result.top_complaints || []
    };
  } catch (err) {
    console.error("OpenAI class insights failed:", err.message);
    const scores = feedbackList.map(f => f.sentiment_score || 0);
    const avg = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
    return {
      ai_powered: false,
      satisfaction_score: Math.round(((avg + 1) / 2) * 100),
      raw_avg_score: avg,
      count: feedbackList.length
    };
  }
};
