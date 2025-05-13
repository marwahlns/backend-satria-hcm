// src/routes/api.ts
import express, { Request, Response } from "express";
import * as AttendanceController from "../../controllers/cms/AttendanceController";
import { authenticateJWT } from "../../middleware/auth";
import multer from 'multer';

const router = express.Router();

router.use(authenticateJWT);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Tentukan folder untuk menyimpan file
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname); // Tentukan nama file yang disimpan
  },
});

const upload = multer({ storage });

router.get("/", async (req: Request, res: Response) => {
  await AttendanceController.getAllAttendance(req, res);
});

router.post(
  "/",
  upload.single('foto'), 
  async (req: Request, res: Response) => {
    await AttendanceController.checkInCheckOutAttendance(req, res);
  }
);

export default router;
