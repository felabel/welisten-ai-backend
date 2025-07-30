import Feedback from "../models/Feedback.js";
export function getFeedbackCategories() {
  const categories = Feedback.schema.path("category").enumValues;
  return [...categories, "All"];
}

export function getFeedbackStatus() {
  const statuses = Feedback.schema.path("status").enumValues;
  return statuses;
}
