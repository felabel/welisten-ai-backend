import Feedback from "../models/Feedback.js";
export function getFeedbackCatgeroies() {
  const categories = Feedback.schema.path("category").enumValues;
  return [...categories, "All"];
}
