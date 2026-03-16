const express = require('express');
const path = require('path');
const config = require('./config');
const { getAnswer } = require('./rag');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/chat', async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const reply = await getAnswer(message.trim());
    res.json({ reply });
  } catch (err) {
    next(err);
  }
});

app.use((err, _req, res, _next) => {
  console.error('Server error:', err.message);
  res.status(500).json({ error: 'An internal server error occurred.' });
});

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
});
