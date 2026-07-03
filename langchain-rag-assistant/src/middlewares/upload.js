import multer from "multer";
import { env } from "../config/env.js";

const storage = multer.diskStorage({
  destination: "uploads/",
  filename(req, file, callback) {
    callback(null, `${Date.now()}-${file.originalname}`);
  },
});

function fileFilter(req, file, callback) {
  if (file.mimetype !== "application/pdf") {
    return callback(new Error("Only PDF files are allowed."));
  }
  callback(null, true);
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.maxUploadSizeMb * 1024 * 1024,
  },
});
