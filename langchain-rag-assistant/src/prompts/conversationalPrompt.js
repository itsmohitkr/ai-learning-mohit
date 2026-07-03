import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";

/**
 * Generates the final answer once relevant document chunks have been
 * retrieved. Includes chat_history so the model can resolve pronouns
 * and references from earlier in the conversation when phrasing its
 * answer (separate from the retriever's own history-aware rewriting).
 */
export const conversationalPrompt = ChatPromptTemplate.fromMessages([
  ["system", "Answer the user's question using only the provided context."],
  new MessagesPlaceholder("chat_history"),
  ["human", "Context:\n{context}\n\nQuestion:\n{input}"],
]);
