const fs = require('fs');
const path = require('path');
const lancedb = require('@lancedb/lancedb');
const OpenAI = require('openai');
const config = require('./config');

async function getEmbedding(text, openai) {
  const response = await openai.embeddings.create({
    model: config.embeddingModel,
    input: text,
  });
  return response.data[0].embedding;
}

async function ingest() {
  if (!config.openaiApiKey || config.openaiApiKey === 'sk-placeholder') {
    console.log('OPENAI_API_KEY not set. Skipping embedding generation. The chatbot will use keyword-based matching instead.');
    process.exit(0);
  }

  const openai = new OpenAI({ apiKey: config.openaiApiKey });

  const faqsPath = path.join(__dirname, '..', 'data', 'faqs.json');
  const faqs = JSON.parse(fs.readFileSync(faqsPath, 'utf-8'));

  console.log(`Loaded ${faqs.length} FAQs from ${faqsPath}`);

  const records = [];
  for (const faq of faqs) {
    const text = `${faq.question} ${faq.answer}`;
    console.log(`Embedding FAQ #${faq.id}: ${faq.question}`);
    const vector = await getEmbedding(text, openai);
    records.push({
      id: faq.id,
      question: faq.question,
      answer: faq.answer,
      text,
      vector,
    });
  }

  const dbDir = path.resolve(config.dbPath);
  fs.mkdirSync(dbDir, { recursive: true });

  const db = await lancedb.connect(dbDir);

  try {
    await db.dropTable('faqs');
    console.log('Dropped existing faqs table.');
  } catch {
    // Table doesn't exist yet, that's fine
  }

  await db.createTable('faqs', records);
  console.log(`Successfully ingested ${records.length} FAQs into LanceDB at ${dbDir}`);
}

ingest().catch((err) => {
  console.error('Ingest failed:', err);
  process.exit(1);
});
