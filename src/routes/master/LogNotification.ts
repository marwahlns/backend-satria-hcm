// src/routes/api.ts
import express, { Request, Response } from "express";
import * as NotificationController from "../../controllers/cms/LogNotification";
import { authenticateJWT } from "../../middleware/auth";

const router = express.Router();

// Jika ingin menggunakan middleware untuk semua routes
// router.use(authenticateJWT);

router.delete(
  "/:id",
  async (req: Request, res: Response) => {
    await NotificationController.deleteNotification(req, res);
  }
);

router.delete(
  "/delete-all/:nrp",
  async (req: Request, res: Response) => {
    await NotificationController.deleteAllNotificationsByUser(req, res);
  }
);


export default router;