import { Schema } from "mongoose";

const replySchema = new Schema(
  {
    id: { type: String }, // for frontend
    userId: String,
    text: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

export default replySchema;
