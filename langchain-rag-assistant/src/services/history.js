import { RedisChatMessageHistory } from "./redisMessageHistory.js";

/**
 * Chapter 19's version of this function returned an in-memory
 * ChatMessageHistory from a Map. This version returns a Redis-backed
 * one instead, so conversations survive server restarts and work
 * correctly behind a load balancer with multiple server instances
 * (Chapter 20, Problem 1).
 */
export function getHistory(sessionId) {
  return new RedisChatMessageHistory(sessionId);
}
