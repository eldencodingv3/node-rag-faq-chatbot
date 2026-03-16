const path = require('path');
const lancedb = require('@lancedb/lancedb');
const OpenAI = require('openai');
const config = require('./config');

let db = null;
let table = null;
let openai = null;

async function init() {
  if (!config.openaiApiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required.');
  }
  openai = new OpenAI({ apiKey: config.openaiApiKey });
  const dbDir = path.resolve(config.dbPath);
  db = await lancedb.connect(dbDir);
  try {
    table = await db.openTable('faqs');
  } catch {
    table = null;
  }
}

async function getEmbedding(text) {
  const response = await openai.embeddings.create({
    model: config.embeddingModel,
    input: text,
  });
  return response.data[0].embedding;
}

async function getAnswer(userQuery) {
  if (!openai) {
    await init();
  }

  if (!table) {
    try {
      table = await db.openTable('faqs');
    } catch {
      return 'The FAQ database has not been set up yet. Please run "npm run ingest" first to load the FAQ data.';
    }
  }

  const queryVector = await getEmbedding(userQuery);

  const results = await table
    .vectorSearch(queryVector)
    .limit(config.topK)
    .toArray();

  let contextText = '';
  if (results.length > 0) {
    contextText = results
      .map((r, i) => `FAQ ${i + 1}:\nQ: ${r.question}\nA: ${r.answer}`)
      .join('\n\n');
  }

  const systemPrompt = `You are a helpful and friendly customer support chatbot. Answer the user's question based on the FAQ context provided below. If the context doesn't contain relevant information, politely let the user know and suggest they contact our support team directly.

FAQ Context:
${contextText || 'No relevant FAQ entries found.'}`;

  const completion = await openai.chat.completions.create({
    model: config.chatModel,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userQuery },
    ],
    temperature: 0.7,
    max_tokens: 500,
  });

  return completion.choices[0].message.content;
}

module.exports = { getAnswer };
