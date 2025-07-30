import { Router } from "express";
const router = Router();

import protect from "../middleware/authMiddleware.js";
import {
  createFeedback,
  getFeedbacks,
  getFeedbackById,
  updateFeedback,
  upvoteFeedback,
  updateFeedbackStatus,
} from "../controllers/feedbackController.js";

// 📄 Public: Get all feedback
router.get("/", getFeedbacks);

// 📄 Public: Get feedback by ID
router.get("/:id", getFeedbackById);

// 🔐 Private: Create new feedback
router.post("/", protect, createFeedback);

// 🔐 Private: Update feedback
router.put("/:id", protect, updateFeedback);
router.post("/:feedbackId/upvote", protect, upvoteFeedback);
router.patch("/:id/status", protect, updateFeedbackStatus);

export default router;
