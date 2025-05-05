// src/routes/api.ts
import express, { Request, Response } from "express";
import * as ShiftController from "../../controllers/cms/MsShiftController";
import { authenticateJWT } from "../../middleware/auth";

const router = express.Router();

// Jika ingin menggunakan middleware untuk semua routes
// router.use(authenticateJWT);

router.get("/", async (req: Request, res: Response) => {
  await ShiftController.getAllShift(req, res);
});

router.get(
  "/:id",
  async (req: Request, res: Response) => {
    await ShiftController.getShiftById(req, res);
  }
);

router.post(
  "/",
  async (req: Request, res: Response) => {
    await ShiftController.createShift(req, res);
  }
);

router.put(
  "/:id",
  async (req: Request, res: Response) => {
    await ShiftController.updateShift(req, res);
  }
);

router.delete(
  "/:id",
  async (req: Request, res: Response) => {
    await ShiftController.deleteShift(req, res);
  }
);

export default router;
