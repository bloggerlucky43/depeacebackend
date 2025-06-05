import pool from "../config/db.js";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

dotenv.config();
const saltRound = parseInt(process.env.SALT, 10);

export const GetDashboardStats = async (req, res) => {
  const { session, term } = req.query;

  console.log("query parameters are:", session, term);

  if (!session || !term)
    return res
      .status(400)
      .json({ message: "Session and terms are required please log in" });

  try {
    const queryData = `
        SELECT
        -- results
        (SELECT COUNT(*) FROM results WHERE approved=false) AS unapproved_count,

        --users
        (SELECT COUNT(*) FROM users WHERE role='teacher') AS teacher_count,
        (SELECT COUNT(*) FROM users WHERE role='student') AS student_count,
 
        --receipts
        (SELECT COALESCE(SUM(amount),0) FROM receipt) AS total_amount_paid
        `;

    const { rows } = await pool.query(queryData);
    console.log(rows);

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error("error fetching dashboard stats:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const GetTeacher = async (req, res) => {
  const { adminId } = req.query;

  if (!adminId)
    return res.status(400).json({ message: "Admin Id is required" });
  try {
    const queryData = await pool.query(`
      SELECT * FROM users
      WHERE role='teacher'
      `);

    console.log(queryData.rows);
    res.status(200).json(queryData.rows);
  } catch (error) {
    console.error("Internal Server error", error);
    res.status(500).json({ message: "Error querying database" });
  }
};

export const MakeAdmin = async (req, res) => {
  const { id } = req.query;

  if (!id) return res.status(400).json({ message: "Teacher ID is required" });

  if(req.user.role !== "admin"){
    return res.status(403).json({message:"Access denied"})
  }
  try {
    const response = await pool.query(
      `UPDATE users SET role='admin' WHERE id=$1`,
      [id]
    );

    if (response.rowCount === 0) {
      return res.status(400).json({ message: "User does not exist" });
    }

    res.status(200).json({ message: "User promoted to admin" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
export const GetStudent = async (req, res) => {
  const { classname } = req.query;

  console.log("Classname is:", classname);

  if (!classname)
    return res.status(400).json({ message: "Classname is required" });

  try {
    const queryData = `
        SELECT * FROM users 
        WHERE class=$1 AND role='student'
        `;

    const values = [classname];

    const query = await pool.query(queryData, values);
    console.log(query.rows);
    res.status(200).json({ results: query.rows });
  } catch (error) {
    console.error("Internal Server error", error);
    res.status(500).json({ message: "Error querying database" });
  }
};

export const UpdateStudent = async (req, res) => {
  const updatedStudent = req.body;

  console.log("The student data is :", updatedStudent);

  if (!updatedStudent)
    return res.status(400).json({ message: "Student data are required" });

  const { id, name, gender, dateofbirth, address, contact } = updatedStudent;

  try {
    const updatedQuery = `
        UPDATE users SET
        name=$1,
        gender=$2,
        dateofbirth=$3,
        address=$4,
        contact=$5
        WHERE id=$6
        RETURNING*;
        `;
    const values = [name, gender, dateofbirth, address, contact, id];

    const fetchUpdate = await pool.query(updatedQuery, values);

    if (fetchUpdate.rowCount === 0)
      return res.status(400).json({ message: "User not found" });

    return res.status(200).json({ message: "Changes saved successfully" });
  } catch (error) {
    console.error("Error updating result:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const AddNewStudent = async (req, res) => {
  const {
    email,
    fullName,
    gender,
    address,
    contact,
    selectedClass,
    dateOfBirth,
    password,
    currentTerm,
    session,
  } = req.body;
  console.log("The add student sign up is:", req.body);
  try {
    if (
      !email ||
      !fullName ||
      !gender ||
      !address ||
      !contact ||
      !selectedClass ||
      !dateOfBirth ||
      !password ||
      !currentTerm ||
      !session
    ) {
      return res.status(400).json({ message: "All fields required" });
    }
    //Check if email already exist
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email.trim()]
    );
    if (existingUser.rows.length > 0)
      return res.status(400).json({ message: "Student exist already" });

    // hash password
    const hashedPassword = await bcrypt.hash(password, saltRound);
    console.log("The hashed password is:", hashedPassword);

    //Create a unique student ID
    let studentId;
    let maxRetries = 3;
    let isUnique = false;

    for (let i = 0; i < maxRetries; i++) {
      const fullname = fullName.trim();
      const firstThree = fullname.slice(0, 3).toUpperCase();
      const timeStamp = Date.now().toString().slice(-4);
      const rand = Math.floor(100 + Math.random() * 900);
      console.log(firstThree, timeStamp);
      studentId = `DPA/${firstThree}/${timeStamp}${rand}`;

      const existingId = await pool.query(
        "SELECT * FROM users WHERE identitynumber = $1",
        [studentId]
      );
      if (existingId.rows.length === 0) {
        isUnique = true;
        break;
      }

      if (!isUnique) {
        return res.status(500).json({
          message: "Could not generate unique student ID. Try again.",
        });
      }
    }

    const query = await pool.query(
      `
            INSERT INTO users (email,gender,role,password,name,contact,address,term,session,class,identitynumber,dateofbirth) 
            VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *
            `,
      [
        email.trim(),
        gender.trim(),
        "student",
        hashedPassword,
        fullName.trim(),
        contact.trim(),
        address.trim(),
        currentTerm.trim(),
        session.trim(),
        selectedClass.trim(),
        studentId,
        dateOfBirth.trim(),
      ]
    );

    console.log(query.rows);

    res.status(200).json({ message: "success", student: query.rows[0] });
  } catch (error) {
    res.status(500).json({ message: "Error adding student ", error });
  }
};
export const AddNewTeacher = async (req, res) => {
  const {
    email,
    fullName,
    gender,
    address,
    contact,
    dateOfBirth,
    password,
    currentTerm,
    session,
  } = req.body;
  console.log("The add student sign up is:", req.body);
  try {
    if (
      !email ||
      !fullName ||
      !gender ||
      !address ||
      !contact ||
      !dateOfBirth ||
      !password ||
      !currentTerm ||
      !session
    ) {
      return res.status(400).json({ message: "All fields required" });
    }
    //Check if email already exist
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email.trim()]
    );
    if (existingUser.rows.length > 0)
      return res.status(400).json({ message: "Student exist already" });

    // hash password
    const hashedPassword = await bcrypt.hash(password.trim(), saltRound);
    console.log("The hashed password is:", hashedPassword);

    //Create a unique teacher ID
    let studentId;
    let maxRetries = 3;
    let isUnique = false;

    for (let i = 0; i < maxRetries; i++) {
      const timeStamp = Date.now().toString().slice(-4);
      const rand = Math.floor(10 + Math.random() * 90);
      console.log(firstThree, timeStamp);
      studentId = `DPA/TEA/${timeStamp}${rand}`;

      const existingId = await pool.query(
        "SELECT * FROM users WHERE identitynumber = $1",
        [studentId]
      );
      if (existingId.rows.length === 0) {
        isUnique = true;
        break;
      }

      if (!isUnique) {
        return res.status(500).json({
          message: "Could not generate unique student ID. Try again.",
        });
      }
    }

    const query = await pool.query(
      `
            INSERT INTO users (email,gender,role,password,name,contact,address,term,session,identitynumber,dateofbirth) 
            VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *
            `,
      [
        email.trim(),
        gender.trim(),
        "teacher",
        hashedPassword,
        fullName.trim(),
        contact.trim(),
        address.trim(),
        currentTerm.trim(),
        session.trim(),
        studentId,
        dateOfBirth.trim(),
      ]
    );

    console.log(query.rows);

    res.status(200).json({ message: "success", student: query.rows[0] });
  } catch (error) {
    res.status(500).json({ message: "Error adding student ", error });
  }
};

export const ApproveResult = async (req, res) => {
  const {
    selectedClass,
    selectedSubject,
    studentId,
    currentTerm,
    currentsession,
  } = req.body;

  console.log("The request parameters are:", req.body);

  if (
    !selectedClass ||
    !selectedSubject ||
    !studentId ||
    !currentTerm ||
    !currentsession
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }
  try {
    const queryData = `
        UPDATE results
        SET approved=true
        WHERE session=$1
        AND class_name=$2
        AND id=$3
        AND term=$4
        AND subject=$5
        RETURNING *
        `;

    const values = [
      currentsession,
      selectedClass,
      studentId,
      currentTerm,
      selectedSubject,
    ];

    const query = await pool.query(queryData, values);

    console.log(query.rows);
    res.status(200).json(query.rows);
  } catch (error) {
    console.error("Internal server error", error);
    res.status(500).json({ message: "Internal Server error", error });
  }
};

export const AdminSaveSingleResult = async (req, res) => {
  const { class_name, subject, results } = req.body;

  console.log("The request parameters are:", req.body);

  if (!class_name || !subject || typeof results !== "object") {
    return res.status(400).json({ message: "All fields are required" });
  }

  const {
    student_id,
    test_score,
    exam_score,
    grade,
    comment,
    term,
    session,
    totalscore,
  } = results;

  if (!student_id) {
    return res
      .status(400)
      .json({ message: "student_id is required in the result" });
  }

  try {
    const updatedQuery = `
        UPDATE results SET
        test_score=$1,
        exam_score=$2,
        grade=$3,
        comment=$4,
        totalscore=$5, 
        class_name=$6,
        subject=$7
        WHERE id=$8
        AND session=$9
        AND term=$10
        RETURNING *
        `;

    const values = [
      test_score,
      exam_score,
      grade,
      comment,
      totalscore,
      class_name,
      subject,
      student_id,
      session,
      term,
    ];

    const query = await pool.query(updatedQuery, values);
    console.log("database query response", query.rows);

    if (query.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "No record found for the given student_id" });
    }

    res.status(200).json(query.rows[0]);
  } catch (error) {
    console.error("Error updating result:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const AdminDeleteResult = async (req, res) => {
  const { studentId } = req.query;

  console.log("The student id:", req.query);

  if (!studentId)
    return res.status(400).json({ message: "Student ID is required" });

  try {
    const deletedQuery = await pool.query(
      `DELETE FROM results WHERE id=$1 RETURNING *`,
      [studentId]
    );
    if (deletedQuery.rowCount === 0) {
      return res
        .status(404)
        .json({ message: "No result found with that student ID" });
    }
    res.status(200).json({
      message: "Result deleted successfully",
      deleted: deletedQuery.rows[0],
    });
  } catch (error) {
    console.error("Error deleting result:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const GenerateReceipt = async (req, res) => {
  const { adminId, session, term } = req.query;
  console.log("The request query are:", adminId, session, term);

  if (!adminId || !session || !term)
    return res
      .status(400)
      .json({ message: "admin id,term and session are required" });

  try {
    const fetchQuery = `
    SELECT r.*,
    s.name AS name,
    s.identitynumber AS identityNumber
    FROM receipt r
    JOIN users s ON r.student_id=s.id
    WHERE r.term=$1 AND r.session=$2
    ORDER BY r.paid_at DESC

    `;

    const values = [term, session];
    const fetchReceipt = await pool.query(fetchQuery, values);
    if (fetchReceipt.rowCount === 0) {
      return res
        .status(404)
        .json({ message: "No receipt found for this term and session" });
    }

    console.log(JSON.stringify(fetchReceipt.rows, null, 2));

    res.status(200).json(fetchReceipt.rows);
  } catch (error) {
    console.error("Error generating receipt:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const PendingResult = async (req, res) => {
  const { classname, subject } = req.query;

  console.log("THe query parameters are:", classname, subject);

  if (!classname || !subject)
    return res.status(400).json({ message: "Parameters are required" });

  try {
    const response = await pool.query(
      `SELECT r.*,
            s.name AS student_name,
            t.name AS teacher_name
            FROM results r
            JOIN users s ON r.student_id=s.id
            JOIN users t ON r.teacher_id=t.id
            WHERE r.class_name=$1 AND r.subject=$2
            `,
      [classname, subject]
    );

    console.log(response.rows);

    res.status(200).json(response.rows);
  } catch (error) {
    console.error("Internal server error", error);
    res.status(500).json({ message: "Server side error" });
  }
};

export const SearchReceipt = async (req, res) => {
  const { identitynumber, term, session } = req.query;

  if (!identitynumber || !term || !session)
    return res.status(400).json({ message: "All field required" });

  try {
    //check if the user exist
    const existingUser = `
    SELECT *
    FROM users u
    JOIN receipt r on u.id=r.student_id
    WHERE u.term=$1 AND u.identitynumber=$2 AND u.session=$3
    `;

    const values = [term, identitynumber, session];

    const fetchReceipt = await pool.query(existingUser, values);
    if (fetchReceipt.rowCount === 0) {
      return res
        .status(404)
        .json({ message: "No receipt found for this term and session" });
    }
    console.log(JSON.stringify(fetchReceipt.rows, null, 2));
    res.status(200).json(fetchReceipt.rows);
  } catch (error) {
    console.error("Error generating receipt:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
