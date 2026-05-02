const { OpenAI } = require('openai');
const vader = require('vader-sentiment');
require('dotenv').config({ path: '../.env' });

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
}) : null;

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
  "top_complaints": ["<phrase>", "<phrase>"],
  "detected_issues": [
    { "issue": "<specific issue detected>", "priority": "High" | "Medium" | "Low" }
  ],
  "trend_story": "<1-2 sentence narrative explaining recent sentiment or performance>"
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

    let health_status = "Moderate";
    if (satisfaction >= 75) health_status = "Good";
    else if (satisfaction < 50) health_status = "Critical";

    return {
      ai_powered: true,
      satisfaction_score: satisfaction,
      class_health_score: satisfaction,
      health_status: health_status,
      raw_avg_score: avg,
      count: feedbackList.length,
      ai_summary: result.summary,
      ai_strengths: result.strengths || [],
      ai_improvements: result.areas_for_improvement || [],
      ai_suggestions: result.suggestions || [],
      ai_overall: result.overall_sentiment || "Neutral",
      top_compliment_phrases: result.top_compliments || [],
      top_complaint_phrases: result.top_complaints || [],
      detected_issues: result.detected_issues || [],
      trend_story: result.trend_story || "Not enough data for trend analysis."
    };
  } catch (err) {
    console.error("OpenAI class insights failed as expected during fallback:", err.message);
    const scores = feedbackList.map(f => f.sentiment_score || 0);
    const avg = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
    
    // Fallback Mock Payload
    const positiveCount = feedbackList.filter(f => f.sentiment_label === 'Positive').length;
    const negativeCount = feedbackList.filter(f => f.sentiment_label === 'Negative').length;
    
    let overall = "Neutral";
    if (positiveCount > negativeCount) overall = "Positive";
    else if (negativeCount > positiveCount) overall = "Negative";

    let summaryText = `Analyzing ${feedbackList.length} recent submissions, the general sentiment is predominantly ${overall.toLowerCase()}. Students are engaging with the materials, but continuous monitoring is advised.`;

    return {
      ai_powered: false,
      satisfaction_score: Math.round(((avg + 1) / 2) * 100),
      class_health_score: Math.round(((avg + 1) / 2) * 100),
      health_status: overall === "Positive" ? "Good" : overall === "Negative" ? "Critical" : "Moderate",
      raw_avg_score: avg,
      count: feedbackList.length,
      ai_summary: summaryText,
      ai_strengths: overall === "Positive" ? ["Strong overall satisfaction", "Good course pacing"] : ["Continued student involvement"],
      ai_improvements: overall === "Negative" ? ["Address recurring pain points", "Enhance regular communication"] : ["Regular check-ins with students"],
      ai_suggestions: ["Review raw feedback for nuanced context", "Maintain open channels for anonymous suggestions"],
      ai_overall: overall,
      top_compliment_phrases: ["Teacher explains clearly", "Finishes syllabus on time"],
      top_complaint_phrases: ["Need more practicals", "Late bloomers need care"],
      detected_issues: overall === "Negative" ? [{ issue: "General dissatisfaction with recent topics", priority: "High" }] : [],
      trend_story: "AI insights are currently unavailable due to API limits. Fallback analysis active."
    };
  }
};

exports.chatWithAssistant = async (message, feedbackContext) => {
  if (!openai) {
    return { response: "OpenAI is not configured. I am unable to answer your query right now." };
  }

  const limitedContext = feedbackContext.slice(0, 50).map(f => `[${f.subjects?.name || 'Subject'}] ${f.feedback_text}`).join('\n');
  
  const prompt = `You are an AI assistant for a Class Representative. 
You are analyzing the following recent student feedback data:
${limitedContext}

The CR is asking you a question. Answer concisely, intelligently, and proactively based on the feedback provided.
CR Query: ${message}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a highly intelligent and helpful AI assistant for educational data analysis. Be concise and actionable." },
        { role: "user", content: prompt }
      ],
      temperature: 0.5,
      max_tokens: 300
    });

    return { response: response.choices[0].message.content };
  } catch (err) {
    console.error("AI Chat failed:", err.message);
    return { response: "I encountered an error analyzing the feedback. Please try again later." };
  }
};
