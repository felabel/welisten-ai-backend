import express from "express";
import protect from "../middleware/authMiddleware.js";

import {
  addComment,
  getCommentsByFeedbackId,
  addReply,
} from "../controllers/commentController.js";

const router = express.Router();

router.post("/", protect, addComment);
router.get("/:feedbackId", getCommentsByFeedbackId);
router.post("/reply", protect, addReply);
router.post("/:commentId/replies", protect, addReply);

export default router;
