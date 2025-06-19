import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import pool from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import protectedRoutes from "./routes/protectedRoutes.js";
import bodyParser from "body-parser";
dotenv.config();

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5000",
  "http://localhost:3000",
  "https://de-peaceacademy.onrender.com",
  "https://depeaceacademy.onrender.com",
];
const corsOptions = {
  origin: allowedOrigins,
  credentials: true, // Allow credentials (cookies, etc.)
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api", protectedRoutes);

// Sync database
pool.connect((err) => {
  if (err) {
    console.error("Error connecting to PostgreSQL:", err.stack);
  } else {
    console.log("Connected to PostgreSQL");
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
