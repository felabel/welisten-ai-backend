// server.js
import "./utils/loadEnv.js";
import { config } from "dotenv";
config();
// Load env vars

import express, { json } from "express";

import cors from "cors";
import connectDB from "./utils/db.js";
import authRoutes from "./routes/authRoutes.js";
import feedbackRoutes from "./routes/feedbackRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";

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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
