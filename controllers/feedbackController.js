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
