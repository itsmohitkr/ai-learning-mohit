import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { chat } from "../controllers/chatController.js";

const router = Router();

router.post("/chat", asyncHandler(chat));

export default router;
