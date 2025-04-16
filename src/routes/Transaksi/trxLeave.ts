import express, { Request, Response } from "express";
import * as TrxLeave from "../../controllers/cms/TrxLeaveController";
import { authenticateJWT, authorizeRoles } from "../../middleware/auth";

const router = express.Router();

// GET: Hanya "Admin HC" yang bisa melihat semua data
router.get(
  "/", 
//   authorizeRoles("Admin HC"), // Hanya Admin HC yang bisa akses
  async (req: Request, res: Response) => {
    await TrxLeave.getAllTrxLeaves(req, res);
  }
);

// POST: Bisa diakses oleh semua role (Admin HC, Superior, Karyawan)
router.post(
  "/",  async (req: Request, res: Response) => {
    await TrxLeave.createTrxLeave(req, res);
  }
);

router.put(
  "/:id", 
  async (req: Request, res: Response) => {
    console.log(req.body);
    await TrxLeave.handleLeave(req, res);
  }
);

// DELETE: Bisa diakses hanya oleh "Admin HC"
router.delete(
  "/:id", 
//   authorizeRoles("Admin HC"), // Hanya Admin HC yang bisa delete
  async (req: Request, res: Response) => {
    await TrxLeave.deleteLeave(req, res);
  }
);

export default router;
