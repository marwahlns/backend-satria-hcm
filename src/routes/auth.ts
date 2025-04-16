// src/routes/auth.ts
import express, { Request, Response } from "express";
import * as AuthController from "../controllers/Auth/AuthController";

const router = express.Router();

// router.post("/register", async (req: Request, res: Response) => {
//   await AuthController.registerUser(req, res);
// });

router.post("/login", async (req: Request, res: Response) => {
  await AuthController.loginUser(req, res);
});

export default router;
