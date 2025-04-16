// src/routes/api.ts
import express, { Request, Response } from "express";
import * as LeaveTypesController from "../../controllers/cms/MsLeaveTypesController";
import { authenticateJWT } from "../../middleware/auth";

const router = express.Router();

// Jika ingin menggunakan middleware untuk semua routes
// router.use(authenticateJWT);

router.get("/", async (req: Request, res: Response) => {
  await LeaveTypesController.getAllLeaveTypes(req, res);
});

router.get(
  "/:id",
  async (req: Request, res: Response) => {
    await LeaveTypesController.getLeaveTypeById(req, res);
  }
);

router.post(
  "/",
  async (req: Request, res: Response) => {
    await LeaveTypesController.createLeaveType(req, res);
  }
);

router.put(
  "/:id",
  async (req: Request, res: Response) => {
    await LeaveTypesController.updateLeveType(req, res);
  }
);

router.delete(
  "/:id",
  async (req: Request, res: Response) => {
    await LeaveTypesController.deleteLeaveType(req, res);
  }
);

export default router;