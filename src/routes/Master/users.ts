// src/routes/api.ts
import express, { Request, Response } from "express";
import * as UserController from "../../controllers/cms/MsUserController";
import { authenticateJWT } from "../../middleware/auth";

const router = express.Router();

// Jika ingin menggunakan middleware untuk semua routes
// router.use(authenticateJWT);

router.get("/", async (req: Request, res: Response) => {
  await UserController.getAllEmployee(req, res);
});

router.post(
  "/",
  async (req: Request, res: Response) => {
    await UserController.createEmployee(req, res);
  }
);

router.put(
  "/:id",
  async (req: Request, res: Response) => {
    await UserController.updateEmployee(req, res);
  }
);

router.delete(
  "/:id",
  async (req: Request, res: Response) => {
    await UserController.deleteEmployee(req, res);
  }
);

export default router;
