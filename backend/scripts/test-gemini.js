const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '../.env' });

async function test() {
  const key = process.env.GEMINI_API_KEY;
  console.log("Testing Gemini Key:", key ? (key.substring(0, 10) + "...") : "MISSING");
  
  if (!key) {
    console.log("ERROR: GEMINI_API_KEY is missing in .env");
    return;
  }

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  try {
    const result = await model.generateContent("hi");
    const response = await result.response;
    console.log("SUCCESS! Response:", response.text());
  } catch (err) {
    console.log("FAILURE!");
    console.log("Message:", err.message);
  }
}

test();
