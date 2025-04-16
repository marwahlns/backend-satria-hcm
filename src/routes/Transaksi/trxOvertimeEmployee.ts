import express, { Request, Response } from "express";
import * as TrxOvertime from "../../controllers/cms/TrxOvertimeController";
import { authenticateJWT, authorizeRoles } from "../../middleware/auth";

const router = express.Router();

// GET: Hanya "Admin HC" yang bisa melihat semua data
router.get(
  "/", 
//   authorizeRoles("Admin HC"), // Hanya Admin HC yang bisa akses
  async (req: Request, res: Response) => {
    await TrxOvertime.getAllTrxOvertimes(req, res);
  }
);

// POST: Bisa diakses oleh semua role (Admin HC, Superior, Karyawan)
router.post(
  "/",  async (req: Request, res: Response) => {
    await TrxOvertime.createTrxOvertime(req, res);
  }
);

router.put(
  "/accepted/:id", 
  async (req: Request, res: Response) => {
    await TrxOvertime.AcceptedOvertime(req, res);
  }
);

router.put(
  "/rejected/:id", 
  async (req: Request, res: Response) => {
    await TrxOvertime.rejectedOvertime(req, res);
  }
);

// DELETE: Bisa diakses hanya oleh "Admin HC"
router.delete(
  "/:id", 
//   authorizeRoles("Admin HC"), // Hanya Admin HC yang bisa delete
  async (req: Request, res: Response) => {
    await TrxOvertime.deleteOvertime(req, res);
  }
);

export default router;
