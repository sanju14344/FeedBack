const OpenAI = require('openai');
require('dotenv').config({ path: '../.env' });

async function test() {
  const key = process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.trim() : null;
  console.log("Testing Key:", key ? (key.substring(0, 10) + "...") : "MISSING");
  
  if (!key) {
    console.log("ERROR: OPENAI_API_KEY is missing in .env");
    return;
  }

  const openai = new OpenAI({ apiKey: key });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "hi" }],
      max_tokens: 5
    });
    console.log("SUCCESS! Response:", response.choices[0].message.content);
  } catch (err) {
    console.log("FAILURE!");
    console.log("Status:", err.status);
    console.log("Message:", err.message);
    console.log("Code:", err.code);
    console.log("Type:", err.type);
  }
}

test();
