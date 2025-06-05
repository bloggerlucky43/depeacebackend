import express from "express";
import {
  Signup,
  Login,
  Logout,
  ForgetPassword,
  ResetPassword,
} from "../controllers/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/signup", Signup);
router.post("/login", Login);
router.post("/forgot-password", ForgetPassword);
router.post("/reset-password", ResetPassword);
router.post("/logout", Logout);
router.get("/verify", authMiddleware, (req, res) => {
  const user = req.user; // From the middleware
  if (!user) return res.status(404).json({ message: "User not found" });
  console.log(user);

  return res.status(200).json({ user });
});

export default router;
