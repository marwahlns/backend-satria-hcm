import JSONbig from "json-bigint";
import { Request, Response } from "express";
import { TrxMutation } from "../../models/Table/Satria/TrxMutation";
import { User } from "../../models/Table/Satria/MsUser";
import { getCurrentWIBDate } from "../../helpers/timeHelper";
import { differenceInDays  } from "date-fns";


export const getAllTrxMutation = async (req: Request, res: Response): Promise<void> => {
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
      const trxMutationData = await TrxMutation.findMany({
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
  
      const userIds = [...new Set(trxMutationData.map((trx) => trx.user))];
      const users = await User.findMany({
        where: { id: Number(userIds) },
        select: { id: true, name: true, department: true },
      });
  
      const userMap = new Map(users.map((user) => [user.id.toString(), user]));
  
      const mergeTrxMutationData = trxMutationData.map((trx) => {
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
      const totalItems = await TrxMutation.count({
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
        message: "Successfully retrieved mutation data",
        data: {
          data: mergeTrxMutationData,
          totalPages,
          currentPage: pageNumber,
          totalItems,
        },
      }));
    } catch (err) {
      console.log("errornya :", err)
      res.status(500).json({ success: false, message: "Error retrieving mutation data" });
    }
  };


  export const createTrxMutation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { user, effective_date, reason } = req.body;
  
      if (!user || !effective_date || !reason ) {
        res.status(400).json({
          success: false,
          message: "All fields must be provided and cannot be empty",
        });
        return;
      }
    
      const newMutation = await TrxMutation.create({
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
        message: "Mutation added successfully",
        data: { newMutation },
      }));
    } catch (error) {
        res.status(500).json({ success: false, message: "Error adding mutation data" });
    }
  };
  
  
export const acceptedMutation = async (
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
      const acceptedMutation = await TrxMutation.update({
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
        message: "Mutation accepted successfully",
        data: { acceptedMutation },
      }));
    } catch (err) {
      res
        .status(500).json({ success: false, message: err });
    }
  };
  
  
  export const rejectedMutation = async (
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
  
      const rejectedMutation = await TrxMutation.update({
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
        message: "Mutation rejected successfully",
        data: { rejectedMutation },
      }));
    } catch (err) {
      res
        .status(500)
        .json({ success: false, message: err });
        
    }
  };

  export const approvedMutation = async (
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
  
      const approvedMutation = await TrxMutation.update({
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
        message: "Mutation approved successfully",
        data: { approvedMutation },
      }));
    } catch (err) {
      res
        .status(500)
        .json({ success: false, message: err });
        
    }
  }; 

  export const getTrxMutationtoApproved = async (req: Request, res: Response): Promise<void> => {
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
  
      const trxMutationData = await TrxMutation.findMany({
        where: {
          NOT: { status_id: 1 }, // Tidak menampilkan status_id = 1
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
            ...(parsedStatus === 4 ? [{ NOT: { accepted: null } }] : []), // Jika status_id = 4, accepted_date harus ada
          ],
        },
        orderBy: {
          [sortField]: sortOrder,
        },
        skip,
        take: pageSize,
      });
  
      const userIds = [...new Set(trxMutationData.map((trx) => trx.user))];
      const users = await User.findMany({
        where: { id: Number(userIds) },
        select: { id: true, name: true, department: true },
      });
  
      // Buat Map untuk mencocokkan data user
      const userMap = new Map(users.map((user) => [user.id.toString(), user]));
  
      const mergeTrxMutationData = trxMutationData.map((trx) => {
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
  
      const totalItems = await TrxMutation.count({
        where: {
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
            ...(parsedStatus === 4 ? [{ NOT: { accepted: null } }] : []),
          ],
        },
      });
  
      const totalPages = Math.ceil(totalItems / pageSize);
      res.status(200).send(JSONbig.stringify({
        success: true,
        message: "Successfully retrieved mutation data",
        data: {
          data: mergeTrxMutationData,
          totalPages,
          currentPage: pageNumber,
          totalItems,
        },
      }));
    } catch (err) {
      res.status(500).json({ success: false, message: "Error retrieving mutation data" });
    }
  };
