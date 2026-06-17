import { config } from 'dotenv';

config();

const API_KEY = process.env.OPENROUTER_API_KEY;
const BASE_API_URL = "https://openrouter.ai/api/v1/chat/completions"
const MODEL_NAME = process.env.MODEL_NAME

const callApi = async (prompt) => {
  const response = await fetch(BASE_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL_NAME,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
    }),
  });
  const result = await response.json();
  if (result.error) {
    console.log(result);
    throw new Error(result.error.message);
  }
  return result.choices?.[0]?.message?.content?.trim();
}

const promptChain = async (user_complaint) => {
  const step1Prompt = `
  You are a bank support agent. Read this customer message and tell me what they want in 1 sentence.

  Customer message:
  ${user_complaint}
  `;

  const step1Response = await callApi(step1Prompt);
  console.log("Customer intent: ", step1Response);

  const categories = ["Account Opening", "Billing Issue", "Account Access", "Transaction Inquiry", "Card Services", "Account Statement", "Loan Inquiry", "General Information"];

  const step2Prompt = `
This is what a customer said: "${user_complaint}"
This is what their issue means: ${step1Response}

Which of these categories fit the ${step1Response}: ${categories.join(", ")}?
List every one that applies and give a reason for each.
`;

  const step2Response = await callApi(step2Prompt);
  console.log("Possible categories: ", step2Response);

  const step3Prompt = `
These categories came up for a customer complaint:
${step2Response}

reply with the single best category that fits and give a reason in one sentence.

Use only these names for the category you pick: ${categories.join(", ")}.
`;

  const step3Response = await callApi(step3Prompt);
  console.log("Best category: ", step3Response);
  const step4Prompt = `
A customer said: "${user_complaint}"
We tagged it as: ${step3Response}

What details do we need from them to resolve this? Only list what's actually relevant. Use a numbered list and it should be clear.
`;

  const step4Response = await callApi(step4Prompt);
  console.log("Additional details needed: ", step4Response);
  const step5Prompt = `
Write a short, friendly response to a bank customer.

Customer message: "${user_complaint}"
Issue type: ${step3Response}
Information needed: ${step4Response}

Keep the reply under 3 sentences. Be clear and conversational. If more information is needed, ask for it. Avoid being too formal and use less bulgy words`

  const step5Response = await callApi(step5Prompt);
  console.log("Final response: ", step5Response);

  return step5Response;
}

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error("Usage: node main.js '<customer query>'");
  process.exit(1);
}

promptChain(args[0]);
