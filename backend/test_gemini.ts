import { getGeminiClient } from './src/modules/config/gemini';

const client = getGeminiClient();
if (!client) {
  console.error("Gemini client is NULL!");
} else {
  console.log("Gemini client is successfully initialized.");
  
  // Let's test generating a response
  client.models.generateContent({
    model: "gemini-2.5-flash", // Using standard stable version or similar
    contents: "Hello, say test",
  }).then(res => {
    console.log("Success! Response text:", res.text);
  }).catch(err => {
    console.error("Error generating content:", err.message);
  });
}
