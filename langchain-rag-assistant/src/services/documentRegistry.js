import crypto from "crypto";
import fs from "fs/promises";
import { pool } from "../db/postgres.js";

/**
 * Hashes the actual file contents, not the filename - so re-uploading
 * the same PDF under a different name is still caught, and uploading a
 * genuinely different file that happens to share a name is not
 * incorrectly treated as a duplicate.
 */
export async function computeChecksum(filePath) {
  const buffer = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export async function findByChecksum(checksum) {
  const result = await pool.query(
    "SELECT id, file_name, page_count, chunk_count, uploaded_at FROM document_registry WHERE checksum = $1",
    [checksum]
  );
  return result.rows[0] ?? null;
}

export async function registerDocument({ fileName, checksum, pageCount, chunkCount }) {
  const result = await pool.query(
    `INSERT INTO document_registry (file_name, checksum, page_count, chunk_count)
     VALUES ($1, $2, $3, $4)
     RETURNING id, file_name, page_count, chunk_count, uploaded_at`,
    [fileName, checksum, pageCount, chunkCount]
  );
  return result.rows[0];
}
