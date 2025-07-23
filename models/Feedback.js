import { Schema, model } from "mongoose";
import commentSchema from "./Comment.js";

const feedbackSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    detail: {
      type: String,
    },
    category: {
      type: String,
      enum: ["UI", "UX", "Enhancement", "Bug", "Feature"],
      default: "Feature",
    },
    status: {
      type: String,
      enum: ["Planned", "InProgress", "Live"],
      default: "Planned",
    },
    upvotes: {
      type: Number,
      default: 0,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    //     user: {
    //   type: String,
    //   required: true,
    // },
    // comments: [commentSchema],
  },
  { timestamps: true }
);

feedbackSchema.virtual("id").get(function () {
  return this._id.toHexString();
});
feedbackSchema.set("toJSON", { virtuals: true });

const Feedback = model("Feedback", feedbackSchema);

export default Feedback;
