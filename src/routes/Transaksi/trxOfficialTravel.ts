import express, { Request, Response } from "express";
import * as TrxOfficialTravel from "../../controllers/cms/TrxOfficialTravelController";
// import { authenticateJWT, authorizeRoles } from "../../middleware/auth";

const router = express.Router();

router.get(
  "/", async (req: Request, res: Response) => {
    await TrxOfficialTravel.getAllTrxOfficialTravel(req, res);
  }
);

router.get(
  "/getOfficialTravelToApproved", async (req: Request, res: Response) => {
    await TrxOfficialTravel.getTrxOfficialTraveltoApproved(req, res);
  }
);

router.post(
  "/",  async (req: Request, res: Response) => {
    await TrxOfficialTravel.createTrxOfficialTravel(req, res);
  }
);

router.put(
  "/accepted/:id", 
  async (req: Request, res: Response) => {
    await TrxOfficialTravel.acceptedOfficialTravel(req, res);
  }
);

router.put(
  "/rejected/:id", 
  async (req: Request, res: Response) => {
    await TrxOfficialTravel.rejectedOfficialTravel(req, res);
  }
);

router.put(
  "/approved/:id", 
  async (req: Request, res: Response) => {
    await TrxOfficialTravel.approvedOfficialTravel(req, res);
  }
);

export default router;
