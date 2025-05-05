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

router.get("/getVendor", async (req: Request, res: Response) => {
  await UserController.getAllVendor(req, res);
});

router.get("/getPlant", async (req: Request, res: Response) => {
  await UserController.getAllPlant(req, res);
});

router.get("/getKlasifikasi", async (req: Request, res: Response) => {
  await UserController.getAllKlasifikasi(req, res);
});

router.get("/getMarital", async (req: Request, res: Response) => {
  await UserController.getAllMaritalStatus(req, res);
});

router.get("/getSuperior", async (req: Request, res: Response) => {
  await UserController.getAllSuperior(req, res);
});

router.get("/getDepartment", async (req: Request, res: Response) => {
  await UserController.getAllDepartment(req, res);
});

export default router;
