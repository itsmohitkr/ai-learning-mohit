import { askQuestion } from "../services/chatService.js";

export async function chat(req, res) {
  const { sessionId, question } = req.body;

  if (!sessionId || !question) {
    return res.status(400).json({ error: "sessionId and question are required." });
  }

  const answer = await askQuestion({ sessionId, question });
  res.json({ answer });
}
