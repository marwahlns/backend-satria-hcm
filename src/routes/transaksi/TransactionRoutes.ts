import express, { Request, Response } from "express";
import * as TrxLeave from "../../controllers/cms/TransactionController";
import { authenticateJWT } from "../../middleware/auth";

const router = express.Router();
router.use(authenticateJWT);

router.get(
  "/", async (req: Request, res: Response) => {
    await TrxLeave.getAllTrxData(req, res);
  }
);

router.put(
  "/:id", async (req: Request, res: Response) => {
    console.log(req.body);
    await TrxLeave.handleTrx(req, res);
  }
);

router.post(
  "/", async (req: Request, res: Response) => {
    console.log(req.body);
    await TrxLeave.createSubmittion(req, res);
  }
);


export default router;
