import express, { Request, Response } from "express";
import * as TrxMutationController from "../../controllers/cms/TrxMutationController";
// import { authenticateJWT, authorizeRoles } from "../../middleware/auth";

const router = express.Router();

router.get(
  "/", async (req: Request, res: Response) => {
    await TrxMutationController.getAllTrxMutation(req, res);
  }
);

router.get(
  "/getMutationToApproved", async (req: Request, res: Response) => {
    await TrxMutationController.getTrxMutationtoApproved(req, res);
  }
);

router.post(
  "/",  async (req: Request, res: Response) => {
    await TrxMutationController.createTrxMutation(req, res);
  }
);

router.put(
  "/accepted/:id", 
  async (req: Request, res: Response) => {
    await TrxMutationController.acceptedMutation(req, res);
  }
);

router.put(
  "/rejected/:id", 
  async (req: Request, res: Response) => {
    await TrxMutationController.rejectedMutation(req, res);
  }
);

router.put(
  "/approved/:id", 
  async (req: Request, res: Response) => {
    await TrxMutationController.approvedMutation(req, res);
  }
);

export default router;
