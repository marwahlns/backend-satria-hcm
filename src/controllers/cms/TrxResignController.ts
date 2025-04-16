import JSONbig from "json-bigint";
import { Request, Response } from "express";
import { TrxResign } from "../../models/Table/Satria/TrxResign";
import { User } from "../../models/Table/Satria/User";
import { getCurrentWIBDate } from "../../helpers/timeHelper";
import { differenceInDays  } from "date-fns";


export const getAllTrxResign = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        page = "1",
        limit = "10",
        search = "",
        sort = "user",
        order = "asc",
        status = "0",
      } = req.query;
  
      // Konversi status ke number
      const parsedStatus = parseInt(status as string, 10);
  
      const pageNumber = parseInt(page as string, 10);
      const pageSize = parseInt(limit as string, 10);
      const skip = (pageNumber - 1) * pageSize;
      const validSortFields = ["user", "effective_date", "reason"];
      const sortField = validSortFields.includes(sort as string) ? (sort as string) : "user";
      const sortOrder = order === "desc" ? "desc" : "asc";

      const statusFilter = parsedStatus > 0 ? { status_id: parsedStatus } : undefined;
      const TrxResignData = await TrxResign.findMany({
        where: {
          NOT: { status_id: Number(3) },
          AND: [
            {
              OR: [
                { user: { contains: search as string } },
                { reason: { contains: search as string } },
                // {
                //     effective_date: {
                //       equals: new Date(search as string).toISOString().split("T")[0]
                //     }
                // },
              ],
            },
            ...(statusFilter ? [statusFilter] : []),
            ...(parsedStatus === 4 ? [{ accepted_remark: null }] : []),
          ],
        },
        orderBy: {
          [sortField]: sortOrder,
        },
        skip,
        take: pageSize,
      });
  
      const userIds = [...new Set(TrxResignData.map((trx) => trx.user))];
      const users = await User.findMany({
        where: { id: Number(userIds) },
        select: { id: true, name: true, department: true },
      });
  
      const userMap = new Map(users.map((user) => [user.id.toString(), user]));
  
      const mergeTrxResignData = TrxResignData.map((trx) => {
        const userData = userMap.get(trx.user.toString());      
        return {
          ...trx,
            user_name: userData?.name || "Unknown",
            dept_name: userData?.department || "Unknown",
            effective_date: trx?.effective_date 
            ? new Date(trx.effective_date).toLocaleString("id-ID", { 
              day: "2-digit", month: "long", year: "numeric"
                }) 
            : null,
        };
        });
      const totalItems = await TrxResign.count({
        where: {
          NOT: { status_id: Number(3) },
          AND: [
            {
              OR: [
                { user: { contains: search as string } },
                { reason: { contains: search as string } },
                // {
                //     effective_date: {
                //       equals: new Date(search as string).toISOString().split("T")[0]
                //     }
                // },
              ],
            },
            ...(statusFilter ? [statusFilter] : []),
            ...(parsedStatus === 4 ? [{ accepted_remark: null }] : []),

          ],
        },
      });
  
      const totalPages = Math.ceil(totalItems / pageSize);
      res.status(200).send(JSONbig.stringify({
        success: true,
        message: "Successfully retrieved resign data",
        data: {
          data: mergeTrxResignData,
          totalPages,
          currentPage: pageNumber,
          totalItems,
        },
      }));
    } catch (err) {
      console.log("errornya :", err)
      res.status(500).json({ success: false, message: "Error retrieving resign data" });
    }
  };


  export const createTrxResign = async (req: Request, res: Response): Promise<void> => {
    try {
      const { user, effective_date, reason } = req.body;
  
      if (!user || !effective_date || !reason ) {
        res.status(400).json({
          success: false,
          message: "All fields must be provided and cannot be empty",
        });
        return;
      }
    
      const newresign = await TrxResign.create({
        data: {
          user,
          status_id: 1,
          effective_date,
          reason,
          accept_to: user,
          approve_to: user,
          created_by: 1,
          created_at: getCurrentWIBDate(),
          updated_by: 1,
          updated_at: getCurrentWIBDate(),
        },
      });
  
      res.status(201).send(JSONbig.stringify({
        success: true,
        message: "resign added successfully",
        data: { newresign },
      }));
    } catch (error) {
        res.status(500).json({ success: false, message: "Error adding resign data" });
    }
  };
  
  
export const acceptedResign = async (
    req: Request,
    res: Response
  ): Promise<void> => {
  
    const { id } = req.params;
    try {
      const { accepted_remark } = req.body;
          if ( !accepted_remark ) {
              res.status(400).json({
              success: false,
              message: "All fields must be provided and cannot be empty",
          });
      }
      const acceptedresign = await TrxResign.update({
        where: { 
          id: Number(id),
        },
        data: {
          status_id: 2,
          accepted: "1",
          accepted_remark,
          accepted_date: getCurrentWIBDate(),
          updated_at: getCurrentWIBDate(),
        },
      });
      res.status(201).send(JSONbig.stringify({
        success: true,
        message: "Resign accepted successfully",
        data: { acceptedresign },
      }));
    } catch (err) {
      res
        .status(500).json({ success: false, message: err });
    }
  };
  
  
  export const rejectedResign = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { id } = req.params;
    try {
      const { rejected_remark } = req.body;
          if ( !rejected_remark ) {
              res.status(400).json({
              success: false,
              message: "All fields must be provided and cannot be empty",
          });
      }
  
      const rejectedresign = await TrxResign.update({
        where: { id: Number(id) },
        data: {
          status_id:4,
          rejected:"1",
          rejected_remark: rejected_remark,
          rejected_date: getCurrentWIBDate(),
          updated_at: getCurrentWIBDate(),
        },
      });
      res.status(201).send(JSONbig.stringify({
        success: true,
        message: "Resign rejected successfully",
        data: { rejectedresign },
      }));
    } catch (err) {
      res
        .status(500)
        .json({ success: false, message: err });
        
    }
  };

  export const approvedResign = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { id } = req.params;
    try {
      const { approved_remark } = req.body;
          if ( !approved_remark ) {
              res.status(400).json({
              success: false,
              message: "All fields must be provided and cannot be empty",
          });
      }
  
      const approvedresign = await TrxResign.update({
        where: { id: Number(id) },
        data: {
          status_id:3,
          approved:"1",
          approved_remark,
          approved_date: getCurrentWIBDate(),
          updated_at: getCurrentWIBDate(),
        },
      });
      res.status(201).send(JSONbig.stringify({
        success: true,
        message: "Resign approved successfully",
        data: { approvedresign },
      }));
    } catch (err) {
      res
        .status(500)
        .json({ success: false, message: err });
        
    }
  }; 

  export const getTrxResigntoApproved = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        page = "1",
        limit = "10",
        search = "",
        sort = "user",
        order = "asc",
        status = "0",
      } = req.query;
  
      // Konversi status ke number
      const parsedStatus = parseInt(status as string, 10);
      const pageNumber = parseInt(page as string, 10);
      const pageSize = parseInt(limit as string, 10);
      const skip = (pageNumber - 1) * pageSize;
      const validSortFields = ["user", "effective_date", "reason"];
      const sortField = validSortFields.includes(sort as string) ? (sort as string) : "user";
      const sortOrder = order === "desc" ? "desc" : "asc";
  
      const statusFilter = parsedStatus > 0 ? { status_id: parsedStatus } : undefined;
  
      const TrxResignData = await TrxResign.findMany({
        where: {
          NOT: { status_id: 1 }, 
          AND: [
            {
                OR: [
                  { user: { contains: search as string } },
                  { reason: { contains: search as string } },
                ],
              },
            ...(statusFilter ? [statusFilter] : []),
            ...(parsedStatus === 4 ? [{ accepted: { not: null } }] : []),
        ],
        },
        orderBy: {
          [sortField]: sortOrder,
        },
        skip,
        take: pageSize,
      });
  
      const userIds = [...new Set(TrxResignData.map((trx) => trx.user))];
      const users = await User.findMany({
        where: { id: Number(userIds) },
        select: { id: true, name: true, department: true },
      });
  
      // Buat Map untuk mencocokkan data user
      const userMap = new Map(users.map((user) => [user.id.toString(), user]));
  
      const mergeTrxResignData = TrxResignData.map((trx) => {
        const userData = userMap.get(trx.user.toString());      
        return {
          ...trx,
            user_name: userData?.name || "Unknown",
            dept_name: userData?.department || "Unknown",
            effective_date: trx?.effective_date 
            ? new Date(trx.effective_date).toLocaleString("id-ID", { 
              day: "2-digit", month: "long", year: "numeric"
                }) 
            : null,
        };
        });
  
      const totalItems = await TrxResign.count({
        where: {
            NOT: { status_id: 1 }, // Tidak menampilkan status_id = 1
            AND: [
              {
                OR: [
                  { user: { contains: search as string } },
                  { reason: { contains: search as string } },
                 
                ],
              },
              ...(parsedStatus > 0 ? [{ status_id: parsedStatus }] : []),
              ...(parsedStatus === 4 ? [{ accepted: { not: null } }] : []), 
            ],
          },          
      });
  
      const totalPages = Math.ceil(totalItems / pageSize);
      res.status(200).send(JSONbig.stringify({
        success: true,
        message: "Successfully retrieved resign data",
        data: {
          data: mergeTrxResignData,
          totalPages,
          currentPage: pageNumber,
          totalItems,
        },
      }));
    } catch (err) {
      res.status(500).json({ success: false, message: "Error retrieving resign data" });
    }
  };
