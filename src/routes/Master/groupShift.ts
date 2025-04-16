// src/routes/api.ts
import express, { Request, Response } from "express";
import * as ShiftGroupController from "../../controllers/cms/MsShiftGroupController";
import { authenticateJWT } from "../../middleware/auth";

const router = express.Router();

// Jika ingin menggunakan middleware untuk semua routes
// router.use(authenticateJWT);


router.get(
    "/",
    async (req: Request, res: Response) => {
      await ShiftGroupController.getAllShiftGroup(req, res);
    }
  );
  
  router.get(
    "/:id",
    async (req: Request, res: Response) => {
      await ShiftGroupController.getGroupShiftById(req, res);
    }
  );
  
  router.put(
    "/:id",
    async (req: Request, res: Response) => {
      await ShiftGroupController.updateShiftGroup(req, res);
    }
  );
  router.post(
    "/",
    async (req: Request, res: Response) => {
      await ShiftGroupController.createShiftGroup(req, res);
    }
  );

  router.delete(
    "/:id",
    async (req: Request, res: Response) => {
      await ShiftGroupController.deleteShiftGroup(req, res);
    }
  );
  export default router;
