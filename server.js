// server.js

import express, { json } from "express";
import { config } from "dotenv";
import cors from "cors";
import connectDB from "./utils/db.js";
import authRoutes from "./routes/authRoutes.js";
import feedbackRoutes from "./routes/feedbackRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";

// Load env vars
config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(json()); // to parse JSON bodies
app.use("/api/auth", authRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/comments", commentRoutes);

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "WeListen API is alive!" });
});

// Mount routes (placeholder)
// app.use("/api/auth", require("./routes/authRoutes"));
// app.use("/api/feedback", require("./routes/feedbackRoutes"));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
