import JSONbig from "json-bigint";
import { Request, Response } from "express";
import { TrxOfficialTravel } from "../../models/Table/Satria/TrxOfficialTravel";
import { User } from "../../models/Table/Satria/User";
import { getCurrentWIBDate, getCurrentWIBTime } from "../../helpers/timeHelper";
import { differenceInDays  } from "date-fns";


export const getAllTrxOfficialTravel = async (req: Request, res: Response): Promise<void> => {
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
      const validSortFields = ["user_name", "start_date", "end_date", "purpose", "destination_city"];
      const sortField = validSortFields.includes(sort as string) ? (sort as string) : "user";
      const sortOrder = order === "desc" ? "desc" : "asc";
      const searchDept = parseFloat(search as string);
  
      const statusFilter = parsedStatus > 0 ? { status_id: parsedStatus } : undefined;
      const trxOfficialTravelData = await TrxOfficialTravel.findMany({
        where: {
          NOT: { status_id: Number(3) },
          AND: [
            {
              OR: [
                { user: { contains: search as string } },
                { purpose: { contains: search as string } },
                { destination_city: { contains: search as string } },
              ],
            },
            ...(statusFilter ? [statusFilter] : []),
          ],
        },
        orderBy: {
          [sortField]: sortOrder,
        },
        skip,
        take: pageSize,
      });
  
      const userIds = [...new Set(trxOfficialTravelData.map((trx) => trx.user))];
      const users = await User.findMany({
        where: { id: Number(userIds) },
        select: { id: true, name: true, department: true },
      });
  
      // Buat Map untuk mencocokkan data user
      const userMap = new Map(users.map((user) => [user.id.toString(), user]));
  
      // Gabungkan data transaksi lembur dengan nama user dan nama departemen
      const mergeTrxOfficialTravelData = trxOfficialTravelData.map((trx) => {
        const userData = userMap.get(trx.user.toString());      
        return {
          ...trx,
            user_name: userData?.name || "Unknown",
            start_date: trx?.start_date 
            ? new Date(trx.start_date).toLocaleString("id-ID", { 
              day: "2-digit", month: "long", year: "numeric"
                }) 
            : null,
            end_date: trx?.end_date 
            ? new Date(trx.end_date).toLocaleString("id-ID", { 
              day: "2-digit", month: "long", year: "numeric"
                }) 
            : null,
        };
        });
  
      const totalItems = await TrxOfficialTravel.count({
        where: {
          NOT: { status_id: Number(3) },
          AND: [
            {
              OR: [
                { user: { contains: search as string } },
                { purpose: { contains: search as string } },
                { destination_city: { contains: search as string } },
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
        message: "Successfully retrieved official travel data",
        data: {
          data: mergeTrxOfficialTravelData,
          totalPages,
          currentPage: pageNumber,
          totalItems,
        },
      }));
    } catch (err) {
      res.status(500).json({ success: false, message: "Error retrieving official travel data" });
    }
  };


  export const createTrxOfficialTravel = async (req: Request, res: Response): Promise<void> => {
    try {
      const { user, start_date, end_date, purpose, destination_city } = req.body;
  
      if (!user || !start_date || !end_date || !purpose || !destination_city) {
        res.status(400).json({
          success: false,
          message: "All fields must be provided and cannot be empty",
        });
        return;
      }
  
      const totalTravelDays = differenceInDays(end_date, start_date) + 1;
  
      const newLeave = await TrxOfficialTravel.create({
        data: {
          user,
          status_id: 1,
          start_date,
          end_date,
          total_leave_days: totalTravelDays,
          purpose,
          destination_city,
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
        message: "Official Travel added successfully",
        data: { newLeave },
      }));
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error creating official travel request",
        error: error instanceof Error ? error.message : error,
      });
    }
  };
  
  
export const acceptedOfficialTravel = async (
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
      const acceptedLeave = await TrxOfficialTravel.update({
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
        message: "Official travel accepted successfully",
        data: { acceptedLeave },
      }));
    } catch (err) {
      res
        .status(500)
        .json({ success: false, message: err });
        
    }
  };
  
  
  export const rejectedOfficialTravel = async (
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
  
      const rejectedLeave = await TrxOfficialTravel.update({
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
        message: "Official travel rejected successfully",
        data: { rejectedLeave },
      }));
    } catch (err) {
      res
        .status(500)
        .json({ success: false, message: err });
        
    }
  };


  export const approvedOfficialTravel = async (
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
  
      const approvedOfficialTravel = await TrxOfficialTravel.update({
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
        message: "Official travel approved successfully",
        data: { approvedOfficialTravel },
      }));
    } catch (err) {
      res
        .status(500)
        .json({ success: false, message: err });
        
    }
  }; 

  export const getTrxOfficialTraveltoApproved = async (req: Request, res: Response): Promise<void> => {
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
      const validSortFields = ["name", "start_date", "end_date", "purpose", "destination_city"];
      const sortField = validSortFields.includes(sort as string) ? (sort as string) : "user";
      const sortOrder = order === "desc" ? "desc" : "asc";
  
      const statusFilter = parsedStatus > 0 ? { status_id: parsedStatus } : undefined;
  
      const trxOfficialTravelData = await TrxOfficialTravel.findMany({
        where: {
          NOT: { status_id: 1 }, // Tidak menampilkan status_id = 1
          AND: [
            {
              OR: [
                { user: { contains: search as string } },
                { purpose: { contains: search as string } },
                { destination_city: { contains: search as string } },
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
  
      const userIds = [...new Set(trxOfficialTravelData.map((trx) => trx.user))];
      const users = await User.findMany({
        where: { id: Number(userIds) },
        select: { id: true, name: true, department: true },
      });
  
      // Buat Map untuk mencocokkan data user
      const userMap = new Map(users.map((user) => [user.id.toString(), user]));
  
      // Gabungkan data transaksi dengan nama user dan format tanggal
      const mergeTrxOfficialTravelData = trxOfficialTravelData.map((trx) => {
        const userData = userMap.get(trx.user.toString());
        return {
          ...trx,
          user_name: userData?.name || "Unknown",
          start_date: trx?.start_date
            ? new Date(trx.start_date).toLocaleString("id-ID", { day: "2-digit", month: "long", year: "numeric" })
            : null,
          end_date: trx?.end_date
            ? new Date(trx.end_date).toLocaleString("id-ID", { day: "2-digit", month: "long", year: "numeric" })
            : null,
        };
      });
  
      const totalItems = await TrxOfficialTravel.count({
        where: {
          AND: [
            {
              OR: [
                { user: { contains: search as string } },
                { purpose: { contains: search as string } },
                { destination_city: { contains: search as string } },
              ],
            },
            ...(statusFilter ? [statusFilter] : []),
            ...(parsedStatus === 4 ? [{ NOT: { accepted: null } }] : []), // Jika status_id = 4, accepted_date harus ada
          ],
        },
      });
  
      const totalPages = Math.ceil(totalItems / pageSize);
      res.status(200).send(JSONbig.stringify({
        success: true,
        message: "Successfully retrieved official travel data",
        data: {
          data: mergeTrxOfficialTravelData,
          totalPages,
          currentPage: pageNumber,
          totalItems,
        },
      }));
    } catch (err) {
      res.status(500).json({ success: false, message: "Error retrieving official travel data" });
    }
  };
  