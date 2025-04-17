import JSONbig from "json-bigint";
import { Request, Response } from "express";
import { TrxOvertime } from "../../models/Table/Satria/TrxOvertime";
import { User } from "../../models/Table/Satria/MsUser";
import { getCurrentWIBDate, getCurrentWIBTime } from "../../helpers/timeHelper";

export const getAllTrxOvertimes = async (req: Request, res: Response): Promise<void> => {
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
    const validSortFields = ["user", "dept", "shift", "check_in_ovt", "check_out_ovt", "note_ovt"];
    const sortField = validSortFields.includes(sort as string) ? (sort as string) : "user";
    const sortOrder = order === "desc" ? "desc" : "asc";
    const searchDept = parseFloat(search as string);

    const statusFilter = parsedStatus > 0 ? { status_id: parsedStatus } : undefined;
    const trxOvertimeData = await TrxOvertime.findMany({
      where: {
        AND: [
          {
            OR: [
              { user: { contains: search as string } },
              { note_ovt: { contains: search as string } },
            ],
          },
          ...(isNaN(searchDept) ? [] : [{ dept: { equals: searchDept } }]),
          ...(statusFilter ? [statusFilter] : []),
        ],
      },
      orderBy: {
        [sortField]: sortOrder,
      },
      skip,
      take: pageSize,
    });

    const userIds = [...new Set(trxOvertimeData.map((trx) => trx.user))];
    const users = await User.findMany({
      where: { id: Number(userIds) },
      select: { id: true, name: true, department: true },
    });

      const userMap = new Map(users.map((user) => [user.id.toString(), user]));
      const mergeTrxOvertimeData = trxOvertimeData.map((trx) => {
      const userData = userMap.get(trx.user.toString());
      const checkIn = trx.check_in_ovt ? new Date(trx.check_in_ovt) : null;
      const checkOut = trx.check_out_ovt ? new Date(trx.check_out_ovt) : null;
    
      // Menentukan tipe parameter `date`
      const formatDateTime = (date: Date | null): string => 
        date ? `${date.toISOString().slice(0, 10)} ${date.toISOString().slice(11, 16)}` : "N/A";
    
      return {
        ...trx,
        user_name: userData?.name || "Unknown",
        dept_name: userData?.department || "Unknown",
        check_in: formatDateTime(checkIn),
        check_out: formatDateTime(checkOut),
      };
    });
    
    

    const totalItems = await TrxOvertime.count({
      where: {
        AND: [
          {
            OR: [
              { user: { contains: search as string } },
              { note_ovt: { contains: search as string } },
            ],
          },
          ...(isNaN(searchDept) ? [] : [{ dept: { equals: searchDept } }]),
          ...(statusFilter ? [statusFilter] : []),
        ],
      },
    });

    const totalPages = Math.ceil(totalItems / pageSize);
    res.status(200).send(JSONbig.stringify({
      success: true,
      message: "Successfully retrieved overtime data",
      data: {
        data: mergeTrxOvertimeData,
        totalPages,
        currentPage: pageNumber,
        totalItems,
      },
    }));
  } catch (err) {
    res.status(500).json({ success: false, message: "Error retrieving overtime data" });
  }
};



// View overtime by id (akses karyawan)
export const getOvertimeById = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  try {
    const insurance = await TrxOvertime.findUnique({
      where: { id: Number(id) },
    });
    if (!insurance) {
      res
        .status(404)
        .json({ success: false, message: "Overtime not found" });
    } else {
      res.status(200).send(JSONbig.stringify({
        success: true,
        message: "Successfully retrieved overtime data",
        data: { insurance },
      }));
    }
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Error retrieving overtime data" });
  }
};


export const createTrxOvertime = async (
  req: Request,
  res: Response
): Promise<void> => {
    try {
    const { user, dept, shift, check_in_ovt, check_out_ovt, note_ovt } = req.body;
        if (!user || !dept || !shift || !check_in_ovt || !check_out_ovt || !note_ovt ) {
            res.status(400).json({
            success: false,
            message: "All fields must be provided and cannot be empty",
        });
    }
    const newOvertime = await TrxOvertime.create({
      data: {
        user: user,
        dept: dept,
        shift: shift,
        status_id: 1,
        check_in_ovt: check_in_ovt,
        check_out_ovt: check_out_ovt,
        note_ovt: note_ovt,
        accept_to: user,
        approve_to: user,
        created_at: getCurrentWIBDate(),
        updated_at: getCurrentWIBDate(),
      },
    });
    res.status(201).send(JSONbig.stringify({
      success: true,
      message: "Overtime added successfully",
      data: { newOvertime },
    }));
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Error adding overtime data" });
  }
};


export const deleteOvertime = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  try {
    const deletedOvertime = await TrxOvertime.update({
      where: { id: Number(id) },
      data: {
        canceled: "canceled"
      }
    });
    if (!deletedOvertime) {
      res
        .status(404)
        .json({ success: false, message: "Overtime not found" });
    } else {
      res.status(201).json({
        success: true,
        message: "Overtime deleted successfully",
      });
    }
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Error deleting overtime data" });
  }
};

export const AcceptedOvertime = async (
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

    const acceptedOvertime = await TrxOvertime.update({
      where: { id: Number(id) },
      data: {
        status_id:2,
        accepted:"Accepted",
        accepted_remark: accepted_remark,
        accepted_date: getCurrentWIBDate(),
        updated_at: getCurrentWIBDate(),
      },
    });
    res.status(201).send(JSONbig.stringify({
      success: true,
      message: "Overtime accepted successfully",
      data: { acceptedOvertime },
    }));
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: err });
      
  }
};


export const rejectedOvertime = async (
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

    const rejectedOvertime = await TrxOvertime.update({
      where: { id: Number(id) },
      data: {
        status_id:4,
        rejected: "Rejected",
        rejected_remark: rejected_remark,
        rejected_date: getCurrentWIBDate(),
        updated_at: getCurrentWIBDate(),
      },
    });
    res.status(201).send(JSONbig.stringify({
      success: true,
      message: "Overtime rejected successfully",
      data: { rejectedOvertime },
    }));
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: err });
      
  }
};