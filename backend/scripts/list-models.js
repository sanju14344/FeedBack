const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '../.env' });

async function test() {
  const key = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(key);

  try {
    // There isn't a direct listModels in the genAI class usually without the auth client,
    // but we can try to hit a known model with a simple prompt.
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("test");
    console.log(await result.response.text());
  } catch (err) {
    console.log(err.message);
  }
}
test();
