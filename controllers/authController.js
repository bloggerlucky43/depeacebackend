import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import pool from "../config/db.js";

dotenv.config();
const saltRound = parseInt(process.env.SALT, 10); // now it's a number: 12

console.log("The salt round is: ", saltRound);
export const ForgetPassword = async (req, res) => {
  const { email, id_number } = req.body;
  console.log(email, id_number);

  if (!email || !id_number) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const result = await pool.query(
      `
    SELECT * FROM users WHERE email=$1 AND identitynumber=$2
      `,
      [email.trim(), id_number.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "User not found" });
    }

    res.status(200).json({ message: "user verified. Proceed to reset" });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

export const ResetPassword = async (req, res) => {
  const { id_number, newPassword, confirmPassword } = req.body;

  console.log(req.body);

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: "Password does not match" });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword.trim(), saltRound);
    console.log("The hashed password is:", hashedPassword);

    const queryData = await pool.query(
      `
      UPDATE users SET password=$1 WHERE identitynumber=$2
      `,
      [hashedPassword, id_number.trim()]
    );

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {}
};
export const Signup = async (req, res) => {
  try {
    const { email, name, password, role, gender } = req.body;
    console.log("the request sign up body is", req.body);

    if (!email || !name || !password || !gender || !role) {
      return res.status(404).json({ message: "All field required" });
    }

    //check if email already exists
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email.trim()]
    );
    if (existingUser.rows.length > 0)
      return res.status(400).json({ message: "Email already exist" });
    console.log("We dey here");

    //Hash Password
    const hashedPassword = await bcrypt.hash(password, saltRound);
    console.log("The hashed password is:", hashedPassword);
    await pool.query(
      "INSERT INTO users(email,gender,role,password,name) VALUES($1,$2,$3,$4,$5)",
      [email.trim(), gender.trim(), role.trim(), hashedPassword, name.trim()]
    );
    //Create new user

    res.status(200).json({ message: "success" });
  } catch (error) {
    res.status(500).json({ message: "Error signing up", error });
  }
};

export const Login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "All fields required" });

    console.log("The request from login", req.body);

    //Find user
    const result = await pool.query("SELECT * FROM users WHERE email=$1", [
      email.trim(),
    ]);
    if (result.rows.length === 0)
      return res.status(400).json({ message: "User not found" });
    console.log(result);

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password.trim(), user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid password" });

    //Generate JWT
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    console.log("JSON token", token);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "None",
      maxAge: 60 * 60 * 1000,
    });
    return res.status(200).json({ message: "Login successful", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error logging in", error: error.message });
  }
};

export const Logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
  return res.status(200).json({ message: "Logged out successfully" });
};
