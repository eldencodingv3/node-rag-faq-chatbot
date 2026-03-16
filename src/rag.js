const fs = require('fs');
const path = require('path');
const lancedb = require('@lancedb/lancedb');
const OpenAI = require('openai');
const config = require('./config');

let db = null;
let table = null;
let openai = null;

async function init() {
  if (!config.openaiApiKey || config.openaiApiKey === 'sk-placeholder') {
    console.log('OPENAI_API_KEY not set. Using keyword-based fallback mode.');
    return;
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

function getKeywordMatches(query, faqs) {
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  const scored = faqs.map(faq => {
    const text = (faq.question + ' ' + faq.answer).toLowerCase();
    const matches = queryWords.filter(word => text.includes(word));
    return { ...faq, score: matches.length };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.filter(f => f.score > 0).slice(0, 3);
}

function loadFaqs() {
  const faqsPath = path.join(__dirname, '..', 'data', 'faqs.json');
  return JSON.parse(fs.readFileSync(faqsPath, 'utf-8'));
}

function fallbackAnswer(userQuery) {
  const faqs = loadFaqs();
  const matches = getKeywordMatches(userQuery, faqs);

  if (matches.length > 0) {
    const topMatch = matches[0];
    let response = topMatch.answer;
    if (matches.length > 1) {
      response += '\n\nYou might also find this helpful: ' + matches[1].answer;
    }
    return response;
  }

  return "I couldn't find a specific answer to your question in our FAQ. Please contact our support team at support@example.com for further assistance.";
}

async function getAnswer(userQuery) {
  if (!openai) {
    await init();
  }

  // If OpenAI is available, try full RAG pipeline
  if (openai) {
    try {
      if (!table) {
        try {
          table = await db.openTable('faqs');
        } catch {
          // Table not available, fall through to keyword matching
          console.log('FAQ table not found, using keyword fallback.');
          return fallbackAnswer(userQuery);
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
    } catch (err) {
      console.error('OpenAI error, falling back to keyword matching:', err.message);
      // Fall through to keyword matching
    }
  }

  // Keyword-based fallback
  return fallbackAnswer(userQuery);
}

module.exports = { getAnswer };
