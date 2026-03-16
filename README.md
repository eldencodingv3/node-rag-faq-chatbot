# Node.js RAG FAQ Chatbot

A customer support chatbot powered by Retrieval-Augmented Generation (RAG). Uses OpenAI embeddings with LanceDB vector search to find relevant FAQs, then generates natural language answers with GPT-3.5-turbo.

## Features

- **RAG Pipeline**: Embeds FAQ data into vectors, retrieves the most relevant entries for each query, and generates contextual answers
- **Vector Search**: Uses LanceDB (embedded vector database) for fast similarity search
- **OpenAI Integration**: text-embedding-ada-002 for embeddings, GPT-3.5-turbo for answer generation
- **Chat Interface**: Clean, responsive web UI with message history and loading indicators
- **Easy FAQ Updates**: Simply edit the JSON file and re-run the ingest script

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:

```
OPENAI_API_KEY=sk-your-actual-api-key
```

### 3. Ingest FAQ data

```bash
npm run ingest
```

This embeds all FAQ entries from `data/faqs.json` into the LanceDB vector database.

### 4. Start the server

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `OPENAI_API_KEY` | Your OpenAI API key (required) | - |
| `PORT` | Server port | `3000` |
| `LANCEDB_PATH` | Path to LanceDB data directory | `./data/lancedb` |

## Updating FAQs

1. Edit `data/faqs.json` to add, modify, or remove FAQ entries
2. Run `npm run ingest` to re-embed the data
3. Restart the server

Each FAQ entry should have:

```json
{
  "id": 1,
  "question": "Your question here?",
  "answer": "The detailed answer."
}
```

## Project Structure

```
src/
  index.js    - Express server with API routes
  rag.js      - RAG service (embed, search, generate)
  ingest.js   - Script to load FAQs into LanceDB
  config.js   - Environment configuration
public/
  index.html  - Chat interface
  style.css   - Styles
  script.js   - Client-side JavaScript
data/
  faqs.json   - FAQ dataset
```

## API Endpoints

- `GET /api/health` - Health check, returns `{ "status": "ok" }`
- `POST /api/chat` - Send a message, returns `{ "reply": "..." }`
  - Body: `{ "message": "your question" }`

## Scripts

- `npm start` - Start the production server
- `npm run ingest` - Embed FAQs into LanceDB
- `npm run dev` - Start with file watching (auto-restart)

## Deployment

1. Set the `OPENAI_API_KEY` environment variable on your hosting platform
2. Run `npm install` and `npm run ingest` during build
3. Start with `npm start`

The app listens on the port specified by the `PORT` environment variable (default 3000).
