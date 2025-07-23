import Feedback from "../models/Feedback.js";

export async function createFeedback(req, res) {
  const { title, detail, category } = req.body;

  if (!title || !detail) {
    return res.status(400).json({ message: "Title and detail are required" });
  }

  const feedback = await Feedback.create({
    title,
    detail,
    category,
    user: req.user._id,
  });

  res.status(201).json(feedback);
}

export async function getFeedbacks(req, res) {
  const feedbacks = await Feedback.find().sort({ createdAt: -1 });
  res.status(200).json(feedbacks);
}

export async function getFeedbackById(req, res) {
  const { id } = req.params;

  const feedback = await Feedback.findById(id).populate("user");

  if (!feedback) {
    return res.status(404).json({ message: "Feedback not found" });
  }

  res.json(feedback);
}

// update feedback
export async function updateFeedback(req, res) {
  const { id } = req.params;
  const { title, detail, category, status } = req.body;

  const feedback = await Feedback.findByIdAndUpdate(
    id,
    { title, detail, category, status },
    { new: true }
  );

  if (!feedback) {
    return res.status(404).json({ message: "Feedback not found" });
  }

  res.status(200).json(feedback);
}

export const upvoteFeedback = async (req, res) => {
  const { feedbackId } = req.params;
  try {
    const feedback = await Feedback.findByIdAndUpdate(
      feedbackId,
      { $inc: { upvotes: 1 } },
      { new: true }
    );
    if (!feedback) {
      return res.status(404).json({ message: "Feedback not found" });
    }
    res.status(200).json({
      message: "Feedback upvoted successfully",
      upvotes: feedback.upvotes,
      feedback,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
