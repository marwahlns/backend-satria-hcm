import express, { Request, Response } from "express";
import * as TrxLeave from "../../controllers/cms/TransactionController";
import { authenticateJWT } from "../../middleware/auth";
import multer from 'multer';
import path from 'path';
const fs = require('fs');

const router = express.Router();
router.use(authenticateJWT);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.query.type;
    let uploadPath;

    if (type === 'resign') {
      uploadPath = path.join(__dirname, '../../../uploads/file_resign/');
    } else if (type === 'leave') {
      uploadPath = path.join(__dirname, '../../../uploads/file_leave/');
    } else if (type === 'declaration') {
      uploadPath = path.join(__dirname, '../../../uploads/file_declaration/');
    } else {
      return cb(new Error('Invalid type parameter'), '');
    }

    // Pastikan direktori ada
    fs.mkdirSync(uploadPath, { recursive: true });

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

// Inisialisasi multer dengan konfigurasi penyimpanan
const upload = multer({ storage });

router.get(
  "/tren-attendance", async (req: Request, res: Response) => {
    await TrxLeave.getTrendAttendance(req, res);
  }
);

router.get(
  "/tren-submission", async (req: Request, res: Response) => {
    await TrxLeave.getTrendSubmission(req, res);
  }
);

router.get(
  "/", async (req: Request, res: Response) => {
    await TrxLeave.getAllTrxData(req, res);
  }
);

router.put(
  "/:id", async (req: Request, res: Response) => {
    console.log(req.body);
    await TrxLeave.handleTrx(req, res);
  }
);

router.post(
  "/",
  upload.single('file'),
  async (req: Request, res: Response) => {
    await TrxLeave.createSubmittion(req, res);
  }
);


export default router;
