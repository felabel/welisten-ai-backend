import { Schema, model } from "mongoose";

const replySchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
  },
  { timestamps: true }
);

const commentSchema = new Schema(
  {
    feedback: {
      type: Schema.Types.ObjectId,
      ref: "Feedback",
      required: true,
    },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
    replies: [replySchema],
  },
  { timestamps: true }
);

commentSchema.virtual("id").get(function () {
  return this._id.toHexString();
});
commentSchema.set("toJSON", { virtuals: true });
export const Comment = model("Comment", commentSchema);
export default Comment;
