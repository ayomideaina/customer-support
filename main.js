require('dotenv').config();
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.OPENROUTER_API_KEY;
const BASE_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL_NAME = process.env.MODEL_NAME;

const CATEGORIES = [
  'Account Opening',
  'Billing Issue',
  'Account Access',
  'Transaction Inquiry',
  'Card Services',
  'Account Statement',
  'Loan Inquiry',
  'General Information',
];

const loadPrompt = (fileName) =>
  fs.readFileSync(path.join(__dirname, 'prompts', fileName), 'utf-8');

const fillTemplate = (template, values) =>
  Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, value),
    template
  );

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryable = (error) => {
  const status = error?.code;
  const type = error?.metadata?.error_type;
  return status === 503 || status === 429 || type === 'provider_overloaded';
};

const callApi = async (prompt, attempt = 1) => {
  const MAX_ATTEMPTS = 4;

  const response = await fetch(BASE_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL_NAME,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const result = await response.json();

  if (result.error) {
    if (isRetryable(result.error) && attempt < MAX_ATTEMPTS) {
      const delayMs = 1000 * 2 ** (attempt - 1); // 1s, 2s, 4s
      console.warn(
        `  (provider busy, retrying in ${delayMs / 1000}s — attempt ${attempt}/${MAX_ATTEMPTS})`
      );
      await sleep(delayMs);
      return callApi(prompt, attempt + 1);
    }

    console.error(result);
    throw new Error(result.error.message);
  }

  return result.choices?.[0]?.message?.content?.trim();
};

const promptChain = async (customerQuery) => {

  const step1Prompt = fillTemplate(loadPrompt('01_interpret_intent.txt'), {
    customer_message: customerQuery,
  });
  const step1Response = await callApi(step1Prompt);
  console.log('\n[Step 1 - Customer intent]\n', step1Response);

  const step2Prompt = fillTemplate(loadPrompt('02_map_categories.txt'), {
    customer_message: customerQuery,
    step1_response: step1Response,
  });
  const step2Response = await callApi(step2Prompt);
  console.log('\n[Step 2 - Possible categories]\n', step2Response);

  const step3Prompt = fillTemplate(loadPrompt('03_choose_category.txt'), {
    step2_response: step2Response,
    categories: CATEGORIES.join(', '),
  });
  const step3Response = await callApi(step3Prompt);
  console.log('\n[Step 3 - Best category]\n', step3Response);

  const step4Prompt = fillTemplate(loadPrompt('04_extract_details.txt'), {
    customer_message: customerQuery,
    step3_response: step3Response,
  });
  const step4Response = await callApi(step4Prompt);
  console.log('\n[Step 4 - Additional details needed]\n', step4Response);

  const step5Prompt = fillTemplate(loadPrompt('05_generate_response.txt'), {
    customer_message: customerQuery,
    step3_response: step3Response,
    step4_response: step4Response,
  });
  const step5Response = await callApi(step5Prompt);
  console.log('\n[Final response]\n', step5Response);

  return step5Response;
};

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error("Usage: node main.js '<customer query>'");
  process.exit(1);
}

promptChain(args[0]);
