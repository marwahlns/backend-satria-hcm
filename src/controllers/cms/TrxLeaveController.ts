import JSONbig from "json-bigint";
import { Request, Response } from "express";
import { TrxLeave } from "../../models/Table/Satria/TrxLeave";
import { User } from "../../models/Table/Satria/MsUser";
import { getCurrentWIBDate, getCurrentWIBTime } from "../../helpers/timeHelper";
import { differenceInDays  } from "date-fns";


export const getAllTrxLeaves = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = "1",
      limit = "10",
      search = "",
      sort = "user",
      order = "asc",
      status = "0",
      superiorNrp = "",
      departmentNrp = "",
      userIdLogin = "",

    } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const pageSize = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * pageSize;
    const validSortFields = [  "name", "department", "title", "start_date", "end_date", "total_leave_days"];
    const sortField = validSortFields.includes(sort as string) ? (sort as string) : "user";
    const sortOrder = order === "desc" ? "desc" : "asc";

    const parsedStatus = parseInt(status as string, 10);
    const statusFilter = parsedStatus > 0 ? { status_id: parsedStatus } : undefined;
    const TrxLeaveData = await TrxLeave.findMany({
      where: {
        AND: [
          {
            OR: [
              { user_data: { name: { contains: search as string } } },
              { user_data: { department: { contains: search as string } } },
              { leave_type: { title: { contains: search as string } } },
            ],
          },
          ...(statusFilter ? [statusFilter] : []),
          ...(userIdLogin ? [{ id: Number(userIdLogin) }] : []),
          ...(superiorNrp ? [{ user_data: { superior: { equals: superiorNrp as string } } }] : []),
          ...(departmentNrp ? [{ user_data: { dept_data: { depthead_nrp: { equals: departmentNrp as string } } } }] : []),
        ],
      },
      include: {
        leave_type: {
          select: {
            title: true,
          },
        },
        user_data: {
          select: {
            name: true,
            department: true,
            superior: true,
            dept_data: {
              select: {
                nama: true,
                depthead_nrp: true,
                depthead_name: true,
              },
            },
          },
        },
      },
      orderBy: ["name", "department"].includes(sortField)
      ? { user_data: { [sortField]: sortOrder } } 
      : { [sortField]: sortOrder }, 

      skip,
      take: pageSize,
    });

    const statusMap: Record<number, string> = {
      1: "Pending",
      2: "Accepted",
      3: "Approved",
      4: "Reject Accepted",
      5: "Reject Approved",
    };
    
    const mergeTrxLeaveData = TrxLeaveData.map((trx) => {
      const statusId = Number(trx.status_id);
      let statusLeave = statusMap[statusId] || "Unknown";
    
      // Ambil nama supervisor dan superior (gunakan "-" jika tidak ada)
      const supervisor = trx.user_data?.dept_data?.depthead_name || "-";
      const superior = trx.user_data?.superior || "-";
    
      // Tambahkan "by" sesuai status
      if ([2, 4].includes(statusId)) {
        statusLeave += ` by ${supervisor}`;
      } else if ([3, 5].includes(statusId)) {
        statusLeave += ` by ${superior}`;
      }
    
      return {
        ...trx,
        leave_type_name: trx.leave_type?.title || "Unknown",
        start_date: trx.start_date
          ? new Date(trx.start_date).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })
          : null,
        end_date: trx.end_date
          ? new Date(trx.end_date).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })
          : null,
        status_leave: statusLeave,
        user_name: trx.user_data?.name,
        user_departement: trx.user_data?.dept_data?.nama,
      };
    });
    
    
    const totalItems = await TrxLeave.count({
      where: {
        AND: [
          {
            OR: [
              { user_data: { name: { contains: search as string } } },
              { user_data: { department: { contains: search as string } } },
            ],
          },
          ...(statusFilter ? [statusFilter] : []),
        ],
      },
    });

    const totalPages = Math.ceil(totalItems / pageSize);
    res.status(200).send(JSONbig.stringify({
      success: true,
      message: "Successfully retrieved leave data",
      data: {
        data: mergeTrxLeaveData,
        totalPages,
        currentPage: pageNumber,
        totalItems,
      },
    }));
  } catch (err) {
    res.status(500).json({ success: false, message: "Error retrieving leave data" });
    console.log("ERROR DI BE:", err)
  }
};

export const createTrxLeave = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user, leave_type_id, start_date, end_date, flag_leaves, leave_reason } = req.body;

    if (!user || !leave_type_id || !start_date || !end_date || !flag_leaves || !leave_reason) {
      res.status(400).json({
        success: false,
        message: "All fields must be provided and cannot be empty",
      });
      return;
    }

    // Cari user berdasarkan ID atau NRP (tergantung struktur datanya)
    const userData = await User.findUnique({
      where: { id: user }, // sesuaikan jika pakai 'nrp' atau 'username'
      include: {
        dept_data: {
          select: {
            id: true,
            depthead_nrp: true,
          },
        },
      },
    });

    if (!userData || !userData.dept_data) {
      res.status(404).json({
        success: false,
        message: "User or department data not found",
      });
      return;
    }

    const acceptToValue = userData.superior
    const approveToValue = userData.dept_data.depthead_nrp
    const deptValue = userData.dept;

    const totalLeaveDays = differenceInDays(new Date(end_date), new Date(start_date)) + 1;

    const newLeave = await TrxLeave.create({
      data: {
        user,
        dept: deptValue,
        status_id: 1,
        leave_type_id,
        start_date: new Date(start_date),
        end_date: new Date(end_date),
        flag_leaves,
        total_leave_days: totalLeaveDays,
        leave_reason,
        accept_to: acceptToValue,
        approve_to: approveToValue,
        created_by: 1,
        created_at: getCurrentWIBDate(),
        updated_by: 1,
        updated_at: getCurrentWIBDate(),
      },
    });

    res.status(201).send(JSONbig.stringify({
      success: true,
      message: "Leave added successfully",
      data: { newLeave },
    }));
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating leave request",
      error: error instanceof Error ? error.message : error,
    });
  }
};


export const deleteLeave = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  try {
    const deletedLeave = await TrxLeave.update({
      where: { id: Number(id) },
      data: {
        canceled: "1",
        canceled_date: getCurrentWIBDate(),
        canceled_remark: "cancel"
      }
    });
    if (!deletedLeave) {
      res
        .status(404)
        .json({ success: false, message: "Leave not found" });
    } else {
      res.status(201).json({
        success: true,
        message: "Leave deleted successfully",
      });
    }
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Error deleting leave data" });
  }
};

export const handleLeave = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { remark, role, actionType } = req.body;  // Ambil remark dan role dari body request

  if (!role) {
    res.status(403).json({ message: "Role is required" });
  }


  console.log("rolee",role)
  if (!remark) {
    res.status(400).json({
      success: false,
      message: "Remark must be provided and cannot be empty",
    });
    return;
  }

  let action = "";
  const now = getCurrentWIBDate();
let updateData: any = {
  updated_at: now,
};
  switch (role) {
    case "Superior":
      if (actionType === "accept") {
        action = "accepted";
        updateData = {
          ...updateData,
          status_id: 2,
          accepted: "1",
          accepted_remark: remark,
          accepted_date: now,
        };
      } else if (actionType === "reject") {
        action = "rejected_by_superior";
        updateData = {
          ...updateData,
          status_id: 4,
          rejected: "1",
          rejected_remark: remark,
          accepted_date: now,
        };
      } else {
        res.status(400).json({
          success: false,
          message: "Invalid actionType for Superior",
        });
      }
      break;
  
    case "DeptHead":
      if (actionType === "approve") {
        action = "approved";
        updateData = {
          ...updateData,
          status_id: 3,
          approved: "1",
          approved_remark: remark,
          approved_date: now,
        };
      } else if (actionType === "reject") {
        action = "rejected_by_depthead";
        updateData = {
          ...updateData,
          status_id: 5,
          rejected: "2",
          rejected_remark: remark,
          approved_date: now,
        };
      } else {
        res.status(400).json({
          success: false,
          message: "Invalid actionType for DeptHead",
        });
      }
      break;
  
    default:
      res.status(403).json({
        success: false,
        message: "Unauthorized role to perform this action",
      });
  }

  try {
    const result = await TrxLeave.update({
      where: { id: Number(id) },
      data: updateData,
    });

    res.status(200).send(
      JSONbig.stringify({
        success: true,
        message: `Leave ${action} successfully`,
        data: result,
      })
    );
  } catch (err) {
    console.log("error handlenya:", err)
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: err,
    });
  }
};