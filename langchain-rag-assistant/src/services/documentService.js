import fs from "fs/promises";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { getVectorStore } from "./vectorStore.js";
import { computeChecksum, findByChecksum, registerDocument } from "./documentRegistry.js";
import { logger } from "../utils/logger.js";

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 100;

/**
 * Loads a PDF, splits it into chunks, embeds them, and stores them in
 * PostgreSQL - the full pipeline from Chapter 18 - with two additions
 * from Chapter 20's production-hardening pass:
 *
 *  - Duplicate detection: re-uploading the same file is detected via
 *    checksum and skipped, instead of silently doubling every chunk
 *    in the vector store (Chapter 20, Problem 2).
 *  - Guaranteed cleanup: the temporary file Multer wrote to disk is
 *    always removed, whether ingestion succeeds, fails, or is skipped
 *    as a duplicate (Chapter 20, Problem 3).
 */
export async function ingestDocument(filePath, fileName) {
  try {
    const checksum = await computeChecksum(filePath);

    const existing = await findByChecksum(checksum);
    if (existing) {
      logger.info({ fileName, checksum }, "Duplicate document detected, skipping ingestion");
      return {
        fileName,
        duplicate: true,
        message: "This document has already been added to the knowledge base.",
        existing,
      };
    }

    const loader = new PDFLoader(filePath);
    const docs = await loader.load();

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: CHUNK_SIZE,
      chunkOverlap: CHUNK_OVERLAP,
    });
    const chunks = await splitter.splitDocuments(docs);

    // Tag every chunk with its source file so retrieved results stay traceable.
    for (const chunk of chunks) {
      chunk.metadata.source = fileName;
    }

    const vectorStore = await getVectorStore();
    await vectorStore.addDocuments(chunks);

    const record = await registerDocument({
      fileName,
      checksum,
      pageCount: docs.length,
      chunkCount: chunks.length,
    });

    logger.info({ fileName, pages: docs.length, chunks: chunks.length }, "Document ingested");

    return {
      fileName,
      duplicate: false,
      pages: docs.length,
      chunks: chunks.length,
      message: "Knowledge base updated successfully.",
      documentId: record.id,
    };
  } finally {
    await fs.unlink(filePath).catch(() => {});
  }
}
