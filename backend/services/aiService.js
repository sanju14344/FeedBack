const { GoogleGenerativeAI } = require('@google/generative-ai');
const vader = require('vader-sentiment');
require('dotenv').config({ path: '../../.env' });

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const model = genAI ? genAI.getGenerativeModel({ model: "gemini-2.5-flash" }) : null;

if (!genAI) {
  console.warn("WARNING: GEMINI_API_KEY not found in environment variables.");
}

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
    if (!model) throw new Error("Gemini not configured");

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

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let jsonText = response.text().trim();
    
    // Handle potential markdown code blocks in response
    if (jsonText.startsWith("```json")) jsonText = jsonText.replace(/```json|```/g, "").trim();
    else if (jsonText.startsWith("```")) jsonText = jsonText.replace(/```/g, "").trim();

    const parsed = JSON.parse(jsonText);
    let label = parsed.label;
    if (!["Positive", "Neutral", "Negative"].includes(label)) label = "Neutral";
    
    return {
      label,
      score: Math.max(-1, Math.min(1, parsed.score)),
      reason: parsed.reason
    };
  } catch (error) {
    console.error("Gemini single analysis failed:", error.message);
    return analyzeSentimentLocal(text, starRatings);
  }
};

exports.generateClassInsights = async (feedbackList) => {
  if (!feedbackList || feedbackList.length === 0) {
    return { count: 0, ai_powered: false };
  }

  try {
    if (!model) throw new Error("Gemini not configured");

    // Cap at 50 for Gemini (generous context)
    const limited = feedbackList.slice(0, 50);
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

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let jsonText = response.text().trim();

    if (jsonText.startsWith("```json")) jsonText = jsonText.replace(/```json|```/g, "").trim();
    else if (jsonText.startsWith("```")) jsonText = jsonText.replace(/```/g, "").trim();

    const resultJson = JSON.parse(jsonText);
    
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
      ai_summary: resultJson.summary,
      ai_strengths: resultJson.strengths || [],
      ai_improvements: resultJson.areas_for_improvement || [],
      ai_suggestions: resultJson.suggestions || [],
      ai_overall: resultJson.overall_sentiment || "Neutral",
      top_compliment_phrases: resultJson.top_compliments || [],
      top_complaint_phrases: resultJson.top_complaints || [],
      detected_issues: resultJson.detected_issues || [],
      trend_story: resultJson.trend_story || "Not enough data for trend analysis."
    };
  } catch (err) {
    console.error("Gemini class insights failed:", err.message);
    const scores = feedbackList.map(f => f.sentiment_score || 0);
    const avg = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
    
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
      trend_story: "Gemini insights currently falling back to local analysis."
    };
  }
};

exports.chatWithAssistant = async (message, feedbackContext) => {
  if (!model) {
    return { response: "Gemini AI is not configured. I am unable to answer your query right now." };
  }

  const limitedContext = feedbackContext.slice(0, 60).map(f => `[${f.subjects?.name || 'Subject'}] ${f.feedback_text}`).join('\n');
  
  const prompt = `You are an AI assistant for a Class Representative. 
You are analyzing the following recent student feedback data:
${limitedContext}

The CR is asking you a question. Answer concisely, intelligently, and proactively based on the feedback provided.
CR Query: ${message}`;

  try {
    console.log(`[Gemini Chat] Processing query: "${message}"`);
    const result = await model.generateContent(prompt);
    const response = await result.response;

    return { response: response.text().trim() };
  } catch (err) {
    console.error("Gemini Chat failed:", err.message);
    return { response: "I encountered an error analyzing the feedback with Gemini. Please try again later." };
  }
};
