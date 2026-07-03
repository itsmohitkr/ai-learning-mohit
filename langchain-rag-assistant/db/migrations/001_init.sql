-- Enables the vector data type used to store embeddings (Chapter 12).
CREATE EXTENSION IF NOT EXISTS vector;

-- Tracks every uploaded document so duplicate uploads can be detected
-- by checksum instead of re-embedding the same file twice
-- (Chapter 20, Problem 2).
CREATE TABLE IF NOT EXISTS document_registry (
  id SERIAL PRIMARY KEY,
  file_name TEXT NOT NULL,
  checksum TEXT NOT NULL UNIQUE,
  page_count INTEGER NOT NULL,
  chunk_count INTEGER NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PGVectorStore creates and manages its own "documents" table
-- (id, content, metadata, embedding) the first time the application
-- calls PGVectorStore.initialize(). This block adds a similarity-search
-- index on top of it once that table exists, so search stays fast as
-- the knowledge base grows (Chapter 20, Problem 10).
--
-- Run `npm run migrate` once BEFORE first starting the app (to create
-- the extension and document_registry table), then again AFTER the
-- app has started at least once and ingested a document (so the
-- "documents" table already exists and this index can be created).
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'documents') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS documents_embedding_hnsw_idx
             ON documents USING hnsw (embedding vector_cosine_ops)';
  END IF;
END $$;
