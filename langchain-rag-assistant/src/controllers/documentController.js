import { ingestDocument } from "../services/documentService.js";

export async function uploadDocument(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded." });
  }

  const result = await ingestDocument(req.file.path, req.file.originalname);
  res.json(result);
}
