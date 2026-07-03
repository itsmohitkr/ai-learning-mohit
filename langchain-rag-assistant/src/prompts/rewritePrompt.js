import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";

/**
 * Rewrites an ambiguous follow-up question ("Can I carry them forward?")
 * into a standalone query the retriever can actually search on. This
 * prompt only rewrites - it must never answer the question itself.
 */
export const rewritePrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `Given the chat history and the latest user question,
rewrite the question so it can be understood without
the previous conversation.
Do not answer the question.
Only rewrite it if necessary.`,
  ],
  new MessagesPlaceholder("chat_history"),
  ["human", "{input}"],
]);
