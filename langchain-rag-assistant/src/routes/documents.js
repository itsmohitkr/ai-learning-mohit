import { Router } from "express";
import { upload } from "../middlewares/upload.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { uploadDocument } from "../controllers/documentController.js";

const router = Router();

router.post("/documents", upload.single("file"), asyncHandler(uploadDocument));

export default router;
