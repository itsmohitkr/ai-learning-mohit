import { OpenAIEmbeddings } from "@langchain/openai";
import { env } from "../config/env.js";

export const embeddings = new OpenAIEmbeddings({
  apiKey: env.openaiApiKey,
  model: "text-embedding-3-small",
});
