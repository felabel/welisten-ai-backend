import Comment from "../models/Comment.js";

export const addComment = async (req, res) => {
  const { feedbackId, text } = req.body;

  if (!feedbackId || !text) {
    return res
      .status(400)
      .json({ message: "Feedback ID and text are required" });
  }

  const comment = await Comment.create({
    feedback: feedbackId,
    user: req.user.id,
    text,
  });

  res.status(201).json(comment);
};

// Get all comments for a feedback
export const getCommentsByFeedbackId = async (req, res) => {
  const { feedbackId } = req.params;
  const comments = await Comment.find({ feedback: feedbackId })
    .populate("user", "username email")
    .populate("replies.user", "username email")
    .sort({ createdAt: -1 });

  res.json(comments);
};

// Reply to a comment
export const addReply = async (req, res) => {
  const { commentId } = req.body;
  const comment = await Comment.findById(commentId);
  if (!comment) {
    return res.status(404).json({ message: "Comment not found" });
  }

  comment.replies.push({
    user: req.user._id,
    text: req.body.text,
  });

  await comment.save();
  res.status(201).json(comment);
};
