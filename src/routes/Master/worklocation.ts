// src/routes/api.ts
import express, { Request, Response } from "express";
import * as WorklocationController from "../../controllers/cms/MsWorklocationController";
import { authenticateJWT } from "../../middleware/auth";

const router = express.Router();

// Jika ingin menggunakan middleware untuk semua routes
// router.use(authenticateJWT);

router.get("/", async (req: Request, res: Response) => {
  await WorklocationController.getAllWorklocation(req, res);
});

router.get(
  "/:id",
  async (req: Request, res: Response) => {
    await WorklocationController.getWorklocationById(req, res);
  }
);

router.post(
  "/",
  async (req: Request, res: Response) => {
    await WorklocationController.createWorklocation(req, res);
  }
);

router.put(
  "/:id",
  async (req: Request, res: Response) => {
    await WorklocationController.updateWorklocation(req, res);
  }
);

router.delete(
  "/:id",
  async (req: Request, res: Response) => {
    await WorklocationController.deleteWorklocation(req, res);
  }
);

export default router;