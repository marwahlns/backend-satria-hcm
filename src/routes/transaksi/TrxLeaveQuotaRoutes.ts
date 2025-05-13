// src/routes/api.ts
import express, { Request, Response } from "express";
import * as TrxLeaveQuotaController from "../../controllers/cms/TrxLeaveQuotaController";
import { authenticateJWT } from "../../middleware/auth";

const router = express.Router();

// Jika ingin menggunakan middleware untuk semua routes
router.use(authenticateJWT);

router.get("/", async (req: Request, res: Response) => {
  await TrxLeaveQuotaController.getAllTrxLeaveQuota(req, res);
});

router.post(
  "/",
  async (req: Request, res: Response) => {
    await TrxLeaveQuotaController.createLeaveQuota(req, res);
  }
);

router.put(
  "/:id",
  async (req: Request, res: Response) => {
    await TrxLeaveQuotaController.updateLeaveQuota(req, res);
  }
);

router.delete(
  "/:id",
  async (req: Request, res: Response) => {
    await TrxLeaveQuotaController.deleteLeaveQuota(req, res);
  }
);

export default router;