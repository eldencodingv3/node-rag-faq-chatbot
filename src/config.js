module.exports = {
  port: process.env.PORT || 3000,
  openaiApiKey: process.env.OPENAI_API_KEY,
  dbPath: process.env.LANCEDB_PATH || './data/lancedb',
  embeddingModel: 'text-embedding-ada-002',
  chatModel: 'gpt-3.5-turbo',
  topK: 3,
};
