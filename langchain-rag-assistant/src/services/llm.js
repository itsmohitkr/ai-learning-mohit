import { ChatOpenAI } from "@langchain/openai";
import { env } from "../config/env.js";

export const model = new ChatOpenAI({
  apiKey: env.openaiApiKey,
  model: "gpt-4.1-mini",
  temperature: 0.3,
});
