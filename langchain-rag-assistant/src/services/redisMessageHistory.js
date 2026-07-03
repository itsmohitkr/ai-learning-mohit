import Redis from "ioredis";
import { BaseListChatMessageHistory } from "@langchain/core/chat_history";
import {
  mapChatMessagesToStoredMessages,
  mapStoredMessagesToChatMessages,
} from "@langchain/core/messages";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

const redisClient = new Redis(env.redisUrl);

redisClient.on("error", (error) => {
  logger.error({ err: error }, "Redis connection error");
});

const SESSION_TTL_SECONDS = 60 * 60 * 24; // 24 hours of inactivity before a conversation expires

/**
 * A Redis-backed implementation of LangChain's chat message history.
 *
 * Chapter 15/19 used an in-memory Map, which is fine for learning but
 * loses every conversation on restart and can't be shared across
 * multiple server instances (Chapter 20, Problem 1). This class stores
 * the same message list in Redis instead, keyed by session ID, so any
 * server instance can serve any user's next request.
 *
 * We extend BaseListChatMessageHistory - LangChain's documented
 * extension point for custom history backends - rather than relying on
 * a specific community package's Redis integration, so this works
 * against any LangChain version without depending on an exact
 * constructor signature.
 */
export class RedisChatMessageHistory extends BaseListChatMessageHistory {
  lc_namespace = ["langchain", "stores", "message", "redis"];

  constructor(sessionId) {
    super();
    this.sessionId = sessionId;
    this.key = `chat_history:${sessionId}`;
  }

  async getMessages() {
    const raw = await redisClient.get(this.key);
    if (!raw) return [];
    const storedMessages = JSON.parse(raw);
    return mapStoredMessagesToChatMessages(storedMessages);
  }

  async addMessage(message) {
    const messages = await this.getMessages();
    messages.push(message);
    const storedMessages = mapChatMessagesToStoredMessages(messages);
    await redisClient.set(this.key, JSON.stringify(storedMessages), "EX", SESSION_TTL_SECONDS);
  }

  async clear() {
    await redisClient.del(this.key);
  }
}
