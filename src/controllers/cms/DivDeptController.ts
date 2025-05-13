import JSONbig from "json-bigint";
import { Request, Response } from "express";
import { MsDivision } from "../../models/Table/Satria/MsDivision";

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
      
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred while retrieving division and department data",
      })
    }
  };
  