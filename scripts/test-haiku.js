// test-haiku.js

// 1. Paste the long-term API key you copied earlier
const BEDROCK_API_KEY = "ABSKQmVkcm9ja0FQSUtleS1mOXQ0LWF0LTExNjI2MTMzOTUxNzpCZjRBZDdwRlZVb1p1bFN0NVhNc0dEU05ybjdGSTBhOGg3UXBNTVR6M1ZZcldUall6Q0R4a3p4eHR3Zz0=";

// 2. We use the Mumbai region endpoint for closer proximity to India
const BEDROCK_URL = "https://bedrock-runtime.ap-south-1.amazonaws.com";

async function testIntentRouting() {
  console.log("Pinging Claude 4.5 sonet...");

  // 3. Using the active Claude 4.5 Haiku model with the global prefix
  const response = await fetch(`${BEDROCK_URL}/model/global.anthropic.claude-opus-4-7/converse`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${BEDROCK_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messages: [
        {
          role: "user",
          content: [
            { text: "Extract the intent and budget from this query: 'I am looking for a 3BHK apartment in Noida under 1.5 Cr.'" }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    console.error("Error:", response.status, await response.text());
    return;
  }

  const data = await response.json();

  // Extracting just the text response from Claude
  console.log("Haiku says:", data.output.message.content[0].text);
}

testIntentRouting();