# Customer Support Classifier

A simple Node.js script that uses the OpenRouter API to analyze a customer support message, identify the intent and category, determine the details needed to resolve it, and generate a short reply.

## Requirements

- Node.js installed

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file in the project root with your API credentials, for example:

```env
 `.env` file with the following variables:
  - `OPENROUTER_API_KEY`
  - `MODEL_NAME`
```

## Run

Use `node main.js` and pass the customer message as a single argument:

```bash
node main.js "I was debited last night"
```

The script will print:

- Customer intent
- Possible categories
- Best category
- Additional details needed
- Final response

## Notes

- The script expects the message text as a single command-line argument.
- If no argument is provided, it will show usage instructions and exit.
