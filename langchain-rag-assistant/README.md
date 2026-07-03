# RAG Assistant

A complete, production-ready Retrieval-Augmented Generation (RAG) assistant built with **Node.js, Express, LangChain, and PostgreSQL + pgvector**.

This is the reference implementation for the **LangChain Handbook** capstone project (Chapters 17-20). Every earlier chapter in the handbook builds one isolated piece of this system; this repository is where all of those pieces are wired together into a real, runnable application.

## What it does

- **Upload PDFs** and automatically extract, chunk, embed, and store them in a searchable knowledge base.
- **Ask questions** about the uploaded documents and get answers grounded in their actual content, not the model's general training.
- **Hold a conversation** — follow-up questions like "Can I carry them forward?" are correctly resolved against earlier context, both for retrieval and for the final answer.
- Survive real-world conditions: duplicate uploads, server restarts, oversized files, wrong file types, and transient API failures are all handled explicitly rather than assumed away.

## Architecture

```
                          ADMIN
Upload PDF
    |
    v
POST /api/documents  ->  Multer (validate + save)  ->  PDFLoader  ->  Text Splitter
    |                                                                      |
    |                                                                      v
    |                                                          Embedding Model
    |                                                                      |
    +----------------  Checksum dedup check  <---------------------------+
    |                                                                      |
    v                                                                      v
document_registry (Postgres)                              PGVectorStore (Postgres + pgvector)

                          USER
Ask Question
    |
    v
POST /api/chat  ->  Chat Controller  ->  Conversational RAG Chain
                                              |
                                              v
                                    Load Chat History (Redis)
                                              |
                                              v
                                  History-Aware Retriever (rewrite + search)
                                              |
                                              v
                                       Chat Model (answer)
                                              |
                                              v
                                    Save Chat History (Redis)
```

Two workflows, kept intentionally independent: one **writes** to the knowledge base (document ingestion), the other **reads** from it (chat). Neither depends on the other being mid-request.

## Project structure

```
rag-assistant/
├── db/
│   ├── migrations/001_init.sql   # pgvector extension, dedup table, HNSW index
│   └── migrate.js                # runs migrations against DATABASE
├── src/
│   ├── config/env.js             # validates required env vars at startup
│   ├── controllers/              # HTTP request/response only, no business logic
│   ├── db/postgres.js            # shared connection pool
│   ├── middlewares/              # Multer, error handling, async wrapper
│   ├── prompts/                  # rewrite prompt + answer-generation prompt
│   ├── routes/                   # maps HTTP routes to controllers
│   ├── services/                 # all LangChain logic lives here
│   ├── utils/logger.js           # structured logging
│   ├── app.js                    # Express app configuration
│   └── server.js                 # entrypoint
├── uploads/                      # temporary storage for uploaded PDFs
├── docker-compose.yml            # local Postgres (pgvector) + Redis
└── .env.example
```

This mirrors the folder structure introduced in Chapter 17, with one addition: `db/migrations/` for schema management, since a real project needs a repeatable way to set up its database rather than one-off manual SQL commands.

## Setup

### Prerequisites

- Node.js 18+
- Docker (for Postgres + Redis), or your own instances of both
- An OpenAI API key

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and set `OPENAI_API_KEY` to a real key. The default Postgres and Redis values match the Docker Compose setup below and don't need to change for local development.

### 3. Start Postgres and Redis

```bash
docker compose up -d
```

### 4. Run database migrations

```bash
npm run migrate
```

This creates the pgvector extension and the `document_registry` table. (You'll run this command a second time after your first successful document upload — see the comment in `db/migrations/001_init.sql` for why: the similarity-search index can only be created after `PGVectorStore` has created its own `documents` table.)

### 5. Start the server

```bash
npm run dev
```

You should see `Server running on port 3000`.

## API reference

### `POST /api/documents`

Upload a PDF to add it to the knowledge base.

```bash
curl -X POST http://localhost:3000/api/documents \
  -F "file=@./EmployeeHandbook.pdf"
```

```json
{
  "fileName": "EmployeeHandbook.pdf",
  "duplicate": false,
  "pages": 18,
  "chunks": 243,
  "message": "Knowledge base updated successfully.",
  "documentId": 1
}
```

Re-uploading the same file returns `"duplicate": true` instead of processing it again.

### `POST /api/chat`

Ask a question. Reuse the same `sessionId` across requests to continue a conversation.

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "user-101", "question": "How many annual leaves do employees receive?"}'
```

```json
{ "answer": "Employees receive 20 annual leaves after completing one year of employment." }
```

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "user-101", "question": "Can I carry them forward?"}'
```

Because the `sessionId` matches, this follow-up is correctly resolved against the previous question.

### `GET /api/health`

Returns `200` with database connectivity status. Useful for load balancers or uptime monitoring.

## How this maps to the handbook

| File | Concept | Chapter |
|---|---|---|
| `src/app.js`, `src/server.js` | Express setup, ES Modules | 2 |
| `src/services/llm.js` | Chat Models | 4 |
| `src/prompts/conversationalPrompt.js` | Prompt Templates, `ChatPromptTemplate` | 5, 14 |
| `src/services/history.js`, `redisMessageHistory.js` | Messages & chat history | 6, 15 |
| `src/services/documentService.js` (loading) | Document Loaders | 9 |
| `src/services/documentService.js` (splitting) | Text Splitters | 10 |
| `src/services/embeddings.js` | Embedding Models | 11 |
| `src/services/vectorStore.js` | Vector Stores (pgvector) | 12 |
| `src/services/chatService.js` (`asRetriever`) | Retrievers | 13 |
| `src/services/chatService.js` (`createRetrievalChain`) | Retrieval Chain | 14 |
| `src/services/chatService.js` (`RunnableWithMessageHistory`) | Conversational RAG | 15 |
| `src/prompts/rewritePrompt.js`, `createHistoryAwareRetriever` | History-Aware Retrievers | 16 |
| Overall folder structure | Project architecture | 17 |
| `src/routes/documents.js` → `documentService.js` | Document ingestion pipeline | 18 |
| `src/routes/chat.js` → `chatService.js` | Conversational chat API | 19 |
| `src/services/history.js` (Redis), `documentRegistry.js`, `errorHandler.js`, `logger.js`, `upload.js` limits/filter, `db/migrations/` | Production hardening | 20 |

## What goes beyond the handbook's code snippets

A few things here are intentionally more thorough than the inline chapter examples, since this is meant to be a real reference implementation:

- **Redis-backed chat history** is fully implemented (Chapter 20 only described the problem and named Redis as the solution).
- **Duplicate document detection** is implemented via SHA-256 checksum, with its own database table.
- **Centralized error handling** replaces per-controller `try/catch`, so every route fails safely and consistently.
- **The vector store singleton caches the initialization *promise*, not just the resolved value** — this closes a subtle race condition where two concurrent early requests could each start their own `PGVectorStore.initialize()` call.
- **Structured logging** via `pino` instead of `console.log`.
- **Environment validation at startup** — the app refuses to start with a clear error message if required configuration is missing, rather than failing confusingly mid-request.

## A note on external APIs

This code is written against the current documented APIs of `@langchain/core`, `@langchain/community`, and `@langchain/openai` as of when it was written. These packages evolve; if you hit an import error after `npm install`, check `node_modules/@langchain/core/package.json` for the installed version against what's imported, and consult the current LangChain JS documentation for that version.

Two things worth knowing about right now:

- **`@langchain/community` is flagged as deprecated/sunsetting upstream** (see [langchain-ai/langchainjs-community#61](https://github.com/langchain-ai/langchainjs-community/issues/61)). It's still the package this repository - and the handbook chapters it implements - use for `PDFLoader` and `PGVectorStore`, and it currently installs and works correctly (verified against the exact import paths used here). If the community package is fully removed in the future, `PDFLoader` and `PGVectorStore` will need to move to whatever package(s) LangChain designates as their replacement.
- **`npm install` requires `--legacy-peer-deps`** (already configured via `.npmrc` in this repo, so you don't need to pass it manually). This is due to an unrelated optional peer dependency conflict between `langchain` and `@langchain/community` over `better-sqlite3` - a dependency this application never actually uses.
- **`npm audit` reports a handful of moderate/high vulnerabilities** in transitive dependencies (`langsmith` tracing, `@langchain/weaviate`, an old `uuid` range). None of these code paths are used by this application - we don't use LangSmith tracing, Weaviate, or anything that constructs `uuid` from untrusted input. Running `npm audit fix --force` would bump `@langchain/community` to a new major version; do that deliberately and re-test the app's imports afterward, rather than as a reflex.

## Validation

Every file in this repository was syntax-checked (`node --check`), every import path was verified to resolve against installed packages, every specific named export used in the code was confirmed to actually exist, and the complete module graph (Express app, all routes, all services, the full RAG chain construction) was loaded successfully end-to-end before this was committed - not just written and assumed correct.
