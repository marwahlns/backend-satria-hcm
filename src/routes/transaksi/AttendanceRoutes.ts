// src/routes/api.ts
import express, { Request, Response } from "express";
import * as AttendanceController from "../../controllers/cms/AttendanceController";
import { authenticateJWT } from "../../middleware/auth";
import multer from 'multer';
import path from "path";

const router = express.Router();

router.use(authenticateJWT);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

router.get("/", async (req: Request, res: Response) => {
  await AttendanceController.getAttendanceReport(req, res);
});

router.get("/summary-by-month", async (req: Request, res: Response) => {
  await AttendanceController.getMonthlyAttendanceSummary(req, res);
});

router.get("/daily", async (req: Request, res: Response) => {
  await AttendanceController.getAllDailyAttendance(req, res);
});

router.get("/shift-today", async (req: Request, res: Response) => {
  await AttendanceController.getAttendanceToday(req, res);
});

router.post(
  "/check-in",
  upload.single('foto'), 
  async (req: Request, res: Response) => {
    await AttendanceController.checkInAttendance(req, res);
  }
);

router.post(
  "/check-out",
  upload.single('foto'), 
  async (req: Request, res: Response) => {
    await AttendanceController.checkOutAttendance(req, res);
  }
);

export default router;
