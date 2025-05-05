// src/routes/api.ts
import express, { Request, Response } from "express";
import * as TrxShiftEmployeeController from "../../controllers/cms/TrxShiftEmployeeController";
import { authenticateJWT } from "../../middleware/auth";

const router = express.Router();

// Jika ingin menggunakan middleware untuk semua routes
// router.use(authenticateJWT);

router.get("/", async (req: Request, res: Response) => {
  await TrxShiftEmployeeController.getAllTrxShiftEmployee(req, res);
});

router.post(
  "/",
  async (req: Request, res: Response) => {
    await TrxShiftEmployeeController.createShiftEmployee(req, res);
  }
);

router.put(
  "/:id",
  async (req: Request, res: Response) => {
    await TrxShiftEmployeeController.updateShiftEmployee(req, res);
  }
);

router.delete(
  "/:id",
  async (req: Request, res: Response) => {
    await TrxShiftEmployeeController.deleteShiftEmployee(req, res);
  }
);

export default router;
