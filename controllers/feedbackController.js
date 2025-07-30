import Feedback from "../models/Feedback.js";
import { getFeedbackCatgeroies } from "../utils/getFeedbackCategories.js";

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
  try {
    // sort by category
    const { category, sort, page = 1, limit = 10 } = req.query;
    const allowedCategories = getFeedbackCatgeroies();
    let filter = {};
    if (category && category !== "All") {
      const normalizedCategory =
        category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
      if (!allowedCategories.includes(normalizedCategory)) {
        return res.status(400).json({ message: "Invalid category" });
      }
      if (normalizedCategory !== "All") {
        filter.category = normalizedCategory;
      }
    }

    const pageNum = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);
    const skip = (pageNum - 1) * pageSize;

    // sort by least and most upvotes
    let sortOption = { createdAt: -1 };
    if (sort === "least_upvotes") sortOption = { upvotes: 1 };
    if (sort === "most_upvotes") sortOption = { upvotes: -1 };
    if (sort === "least_comments") sortOption = { commentCount: 1 };
    if (sort === "most_comments") sortOption = { commentCount: -1 };

    const pipeline = [
      { $match: filter },
      {
        $lookup: {
          from: "comments", // name of the comments collection
          localField: "_id",
          foreignField: "feedback",
          as: "commentsData",
        },
      },
      {
        $addFields: {
          commentCount: { $size: { $ifNull: ["$commentsData", []] } },
        },
      },
      { $sort: sortOption },
      { $skip: skip },
      { $limit: pageSize },

      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          "user.password": 0,
          commentsData: 0,
        },
      },
    ];

    const feedbacks = await Feedback.aggregate(pipeline);
    const totalDocs = await Feedback.countDocuments(filter);
    const totalPages = Math.ceil(totalDocs / pageSize);
    const response = {
      feedbacks,
      pagination: {
        totalDocs,
        totalPages,
        currentPage: pageNum,
        pageSize,
        has_nextPage: pageNum < totalPages && totalPages > 0,
        has_prevPage: pageNum > 1 && totalPages > 0,
      },
    };
    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching feedbacks:", error);
    res.status(500).json({ message: "Server error" });
  }
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
