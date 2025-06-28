import JSONbig from "json-bigint";
import { Request, Response } from "express";
import { MsDivision } from "../../models/Table/Satria/MsDivision";
import { getCurrentWIBDate } from "../../helpers/timeHelper";
import { Error } from "../../models/Table/Satria/LogError";

export const getAllDivDept = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const allDivisions = await MsDivision.findMany({
        include: {
          ms_dept: true,
        },
      });
      res.status(200).send(JSONbig.stringify({
        success: true,
        message: "Successfully retrieved division and department data",
        data: allDivisions
      }));
      
    } catch (err:any) {
      await Error.create({
        data: {
          module: "getAllDivDept",
          message: err?.message ?? String(err),
          created_at: getCurrentWIBDate(),
        },
    });   
      res.status(500).json({
        success: false,
        message: "An error occurred while retrieving division and department data",
      })
    }
  };
  