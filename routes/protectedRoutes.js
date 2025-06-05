import express from "express";
import { Profile, StudentResult } from "../controllers/studentController.js";
import {
  UploadResult,
  FetchAllStudent,
  FetchStudentResult,
  SaveSingleResult,
  ApprovalCount,
} from "../controllers/teacherController.js";
import {
  InitializePayment,
  VerifyPayment,
  WebhookUrl,
  FetchReceipt,
} from "../controllers/paymentController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  GetDashboardStats,
  AdminSaveSingleResult,
  AdminDeleteResult,
  GetStudent,
  UpdateStudent,
  AddNewStudent,
  AddNewTeacher,
  PendingResult,
  ApproveResult,
  GenerateReceipt,
  SearchReceipt,
  GetTeacher,
  MakeAdmin,
} from "../controllers/adminController.js";

const router = express.Router();

router.get("/getteachers", authMiddleware, GetTeacher);
router.get("/student_profile", authMiddleware, Profile);
router.get("/generate_receipt", authMiddleware, GenerateReceipt);
router.get("/student_result", authMiddleware, StudentResult);
router.get("/receipt", authMiddleware, FetchReceipt);
router.get("/receipt/search", authMiddleware, SearchReceipt);
router.get("/fetchstudent/result", authMiddleware, FetchStudentResult);
router.get("/results/approval-count", authMiddleware, ApprovalCount);
router.get("/get-dashboard", authMiddleware, GetDashboardStats);
router.get("/get-student", authMiddleware, GetStudent);
router.get("/fetchpending", authMiddleware, PendingResult);
router.put("/update-student", authMiddleware, UpdateStudent);
router.put("/approval", authMiddleware, ApproveResult);
router.put("/savesingleresult", authMiddleware, AdminSaveSingleResult);
router.patch("/make_admin", authMiddleware, MakeAdmin);
router.delete("/delete_result", authMiddleware, AdminDeleteResult);
router.post("/single_upload", authMiddleware, SaveSingleResult);
router.post("/fetchstudent", authMiddleware, FetchAllStudent);
router.post("/bulk_upload", authMiddleware, UploadResult);
router.post("/addNewStudent", authMiddleware, AddNewStudent);
router.post("/addNewTeacher", authMiddleware, AddNewTeacher);
router.post("/initialize-payment", authMiddleware, InitializePayment);
router.post("/verify_transaction", authMiddleware, VerifyPayment);
router.post("/webhook/url", WebhookUrl);

export default router;
