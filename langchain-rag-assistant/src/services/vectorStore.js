import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { embeddings } from "./embeddings.js";
import { env } from "../config/env.js";

/**
 * Cache the *promise* returned by initialize(), not just the resolved
 * value. If two requests both call getVectorStore() before the first
 * initialization finishes, caching only the final value would let both
 * requests start their own PGVectorStore.initialize() call - creating
 * two connection pools. Caching the in-flight promise means the second
 * caller just awaits the same initialization the first one kicked off.
 */
let vectorStorePromise;

export function getVectorStore() {
  if (!vectorStorePromise) {
    vectorStorePromise = PGVectorStore.initialize(embeddings, {
      postgresConnectionOptions: {
        host: env.db.host,
        port: env.db.port,
        database: env.db.database,
        user: env.db.user,
        password: env.db.password,
      },
      tableName: "documents",
    });
  }
  return vectorStorePromise;
}
