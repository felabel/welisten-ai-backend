import User from "../models/User.js";
import jwt from "jsonwebtoken";

const { sign, verify } = jwt;

// Generate JWT
const generateToken = (userId) => {
  return sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// @desc   Register new user
// @route  POST /api/auth/signup
export async function signup(req, res) {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({ message: "User already exists" });
  }

  const user = await User.create({ username, email, password });

  res.status(201).json({
    _id: user._id,
    username: user.username,
    email: user.email,
    token: generateToken(user._id),
  });
}

// @desc   Login user
// @route  POST /api/auth/login
export async function login(req, res) {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  res.status(200).json({
    _id: user._id,
    username: user.username,
    email: user.email,
    token: generateToken(user._id),
  });
}
