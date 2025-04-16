import express, { Request, Response } from "express";
import * as TrxResignController from "../../controllers/cms/TrxResignController";
// import { authenticateJWT, authorizeRoles } from "../../middleware/auth";

const router = express.Router();

router.get(
  "/", async (req: Request, res: Response) => {
    await TrxResignController.getAllTrxResign(req, res);
  }
);

router.get(
  "/getResignToApproved", async (req: Request, res: Response) => {
    await TrxResignController.getTrxResigntoApproved(req, res);
  }
);

router.post(
  "/",  async (req: Request, res: Response) => {
    await TrxResignController.createTrxResign(req, res);
  }
);

router.put(
  "/accepted/:id", 
  async (req: Request, res: Response) => {
    await TrxResignController.acceptedResign(req, res);
  }
);

router.put(
  "/rejected/:id", 
  async (req: Request, res: Response) => {
    await TrxResignController.rejectedResign(req, res);
  }
);

router.put(
  "/approved/:id", 
  async (req: Request, res: Response) => {
    await TrxResignController.approvedResign(req, res);
  }
);

export default router;
