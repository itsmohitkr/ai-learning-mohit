import { createHistoryAwareRetriever } from "langchain/chains/history_aware_retriever";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { model } from "./llm.js";
import { getVectorStore } from "./vectorStore.js";
import { getHistory } from "./history.js";
import { conversationalPrompt } from "../prompts/conversationalPrompt.js";
import { rewritePrompt } from "../prompts/rewritePrompt.js";

const RETRIEVAL_K = 3;

let conversationalChainPromise;

/**
 * Builds the full conversational RAG pipeline exactly once and reuses it
 * for every request (Chapter 19). Two things are combined here that are
 * easy to build without one of them by accident:
 *
 *  1. A History-Aware Retriever (Chapter 16) - without this, a
 *     follow-up question like "Can I carry them forward?" gets searched
 *     against the vector store verbatim, with no idea what "them"
 *     refers to, and retrieval quality suffers badly.
 *  2. RunnableWithMessageHistory (Chapter 15) - so the final answer
 *     generation step also has the conversation history available for
 *     phrasing its response.
 *
 * Both matter; one without the other leaves a real gap in the pipeline.
 */
async function getChain() {
  if (!conversationalChainPromise) {
    conversationalChainPromise = (async () => {
      const vectorStore = await getVectorStore();
      const retriever = vectorStore.asRetriever({ k: RETRIEVAL_K });

      const historyAwareRetriever = await createHistoryAwareRetriever({
        llm: model,
        retriever,
        rephrasePrompt: rewritePrompt,
      });

      const combineDocsChain = await createStuffDocumentsChain({
        llm: model,
        prompt: conversationalPrompt,
      });

      const chain = await createRetrievalChain({
        retriever: historyAwareRetriever,
        combineDocsChain,
      });

      return new RunnableWithMessageHistory({
        runnable: chain,
        getMessageHistory: getHistory,
        inputMessagesKey: "input",
        historyMessagesKey: "chat_history",
      });
    })();
  }
  return conversationalChainPromise;
}

export async function askQuestion({ sessionId, question }) {
  const chain = await getChain();

  const response = await chain.invoke(
    { input: question },
    { configurable: { sessionId } }
  );

  return response.answer;
}
