import dotenv from "dotenv";
import pool from "../config/db.js";

dotenv.config();

export const Profile = async (req, res) => {
  const { id } = req.query;
  console.log(id);

  if (!id) {
    return res.status(400).json({ message: "Parameter 'id' is required" });
  }

  try {
    const response = await pool.query("SELECT * FROM users WHERE id = $1", [
      id,
    ]);
    if (response.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    console.log(response.rows);
    res.status(200).json({ result: response.rows }); // return first user
  } catch (error) {
    console.error("Internal server error", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const StudentResult = async (req, res) => {
  const { userId, term, session } = req.query;

  console.log("The student ID is:", userId, term, session);
  if (!userId || !term || !session)
    return res
      .status(400)
      .json({ message: "Student ID,term and session are not available" });
  try {
    const result = await pool.query(
      `SELECT r.*,
            s.name AS student_name,
            t.name AS teacher_name
        FROM results r
        JOIN users s ON r.student_id=s.id
        JOIN users t ON r.teacher_id=t.id
        WHERE r.student_id=$1 AND r.term=$2 AND r.session=$3 AND r.approved = true`,
      [userId, term, session]
    );
    console.log("The results are ", result.rows);
    res.status(200).json({ results: result.rows });
  } catch (error) {
    console.error("Error fetching student results:", error.message);
    res.status(500).json({ messae: "Server Error" });
  }
};
