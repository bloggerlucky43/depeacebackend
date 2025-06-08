import pool from "../config/db.js";
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
router.get("/verify", authMiddleware, async (req, res) => {
  const user = req.user; // From the middleware
  if (!user) return res.status(404).json({ message: "User not found" });
  console.log(user);

  try {
    const result = await pool.query(
      `
    SELECT id,email,name,role,term,session,schoolfee,previouslypaid, identitynumber,dateofbirth,contact,address,class,gender FROM users WHERE id=$1
    `,
      [user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const fullUser = result.rows[0];
    res.status(200).json({ user: fullUser });
  } catch (error) {
    console.error("DB error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
