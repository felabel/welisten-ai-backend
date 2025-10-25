import OPENAI from "openai";
import Feedback from "../models/Feedback.js";
import {
  getFeedbackCategories,
  getFeedbackStatus,
} from "../utils/getFeedbackCategories.js";

const openai = new OPENAI({ apiKey: `${process.env.OPENAI_API_KEY}` });

export async function createFeedback(req, res) {
  try {
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

    // ✅ Split title+detail into keywords
    const keywords = `${title} ${detail}`
      .split(/\s+/)
      .filter((word) => word.length > 2); // ignore very short words like "a", "to"

    // ✅ Build regex OR conditions for each keyword
    const keywordRegex = keywords.map((word) => ({
      $or: [
        { title: { $regex: word, $options: "i" } },
        { detail: { $regex: word, $options: "i" } },
      ],
    }));

    const similarFeedbackIds = await Feedback.find({
      _id: { $ne: feedback._id },
      $or: keywordRegex.map((k) => k.$or).flat(), // flatten all ORs
    }).distinct("_id");

    const similarFeedbacks = await Feedback.find({
      _id: { $in: similarFeedbackIds },
    }).limit(5);

    // Rank by shared keyword count
    const ranked = similarFeedbacks
      .map((f) => {
        const text = `${f.title} ${f.detail}`.toLowerCase();
        const overlap = keywords.filter((k) =>
          text.includes(k.toLowerCase())
        ).length;
        return { f, score: overlap };
      })
      .sort((a, b) => b.score - a.score);

    // Only take top 3 most similar
    const topSimilar = ranked.slice(0, 3).map((r) => r.f);

    if (topSimilar.length > 0) {
      const prompt = `
You are checking if a new user feedback is a duplicate of existing ones.

🔹 New feedback:
"${title} - ${detail}"

🔹 Existing feedback:
${similarFeedbacks
  .map((f) => `ID:${f._id} => ${f.title} - ${f.detail}`)
  .join("\n")}

Rules:
- If the new feedback has the same meaning or request as any of the existing ones, mark it as a duplicate.
- Even if the wording is different but the feature/request is the same, mark it as duplicate.
- Respond strictly in this JSON format:
{ "duplicate": true/false, "similarTo": ["id1","id2"] }
`;

      const aiResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0,
      });

      const aiResult = JSON.parse(aiResponse.choices[0].message.content);
      feedback.duplicate = aiResult.duplicate;
      feedback.similarTo = aiResult.similarTo || [];
      if (aiResult.duplicate) {
        return res.status(409).json({
          message: "Similar feedback exists. Upvote instead.",
          similarTo: aiResult.similarTo,
        });
      }

      await feedback.save();
    }

    res.status(201).json(feedback);
  } catch (error) {
    console.error("Error creating feedback:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function getFeedbacks(req, res) {
  try {
    // sort by category
    const { search, category, sort, page = 1, limit = 10 } = req.query;
    const allowedCategories = getFeedbackCategories();
    let filter = {};
    if (category && category !== "All") {
      const normalizedCategory =
        category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();

      console.log("Normalized Category:", normalizedCategory);
      console.log("Allowed Categories:", allowedCategories);
      if (
        !allowedCategories
          .map((c) => c.toLowerCase())
          .includes(normalizedCategory.toLowerCase())
      ) {
        return res.status(400).json({ message: "Invalid category" });
      }
      if (normalizedCategory !== "All") {
        filter.category = allowedCategories.find(
          (c) => c.toLowerCase() === normalizedCategory.toLowerCase()
        );
      }
    }

    // serarch filter
    if (search && search.trim() !== "") {
      const regex = new RegExp(search, "i");
      filter.$or = [{ title: regex }, { detail: regex }, { category: regex }];
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

export async function updateFeedbackStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // const normalizedStatus =
    //   status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

    const allowedStatuses = getFeedbackStatus();
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updatedFeedback = await Feedback.findByIdAndUpdate(
      id,
      { status: status },
      { new: true, runValidators: true }
    );

    if (!updatedFeedback) {
      return res.status(404).json({ message: "Feedback not found" });
    }

    res.status(200).json({
      message: "Feedback status updated successfully",
      feedback: updatedFeedback,
    });
  } catch (error) {
    console.error("Error updating feedback status:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function getCategories(req, res) {
  try {
    const categories = getFeedbackCategories();
    res.status(200).json({ categories });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ message: "Server error" });
  }
}
// GET /api/feedback/status-count
export async function getStatusCount(req, res) {
  try {
    const result = await Feedback.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: { _id: 0, name: "$_id", count: 1 } },
    ]);

    // Ensure all statuses are returned, even if count is 0
    const allStatuses = getFeedbackStatus();
    const statusCount = allStatuses.map((status) => {
      const found = result.find((r) => r.name === status);
      return { name: status, count: found ? found.count : 0 };
    });

    res.status(200).json({ statusCount });
  } catch (error) {
    console.error("Error fetching status count:", error);
    res.status(500).json({ message: "Server error" });
  }
}
