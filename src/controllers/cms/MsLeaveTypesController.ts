import JSONbig from "json-bigint";
import { Request, Response } from "express";
import { LeaveTypes } from "../../models/Table/Satria/MsLeaveTypes";
import { getCurrentWIBDate } from "../../helpers/timeHelper";
import { Error } from "../../models/Table/Satria/LogError";

export const getAllLeaveTypes = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      page = "1",
      limit = "10",
      search = "",
      sort = "id",
      order = "desc",
      trx_quota = "false",
    } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const pageSize = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * pageSize;
    const validSortFields = ["id","title", "days"];
    const sortField = validSortFields.includes(sort as string)
      ? (sort as string)
      : "id";
    const sortOrder = order === "asc" ? "asc" : "desc";
    const searchNumber = parseInt(search as string, 10);
    const isQuotaTransaction = trx_quota === "true";

    // Build where condition
    const whereCondition: any = {
      is_deleted: 0,
      OR: [
        { title: { contains: search as string } },
        ...(isNaN(searchNumber) ? [] : [{ days: { equals: searchNumber } }]),
      ],
    };

    // Add quota filter if trx_quota is true
    if (isQuotaTransaction) {
      whereCondition.is_quota_needed = 0;
    }

    const leaveTypeData = await LeaveTypes.findMany({
      where: whereCondition,
      orderBy: {
        [sortField]: sortOrder,
      },
      skip,
      take: pageSize,
    });

    const totalItems = await LeaveTypes.count({
      where: whereCondition,
    });

    const totalPages = Math.ceil(totalItems / pageSize);
    res.status(200).send(JSONbig.stringify({
      success: true,
      message: "Successfully retrieved leave types data",
      data: {
        data: leaveTypeData,
        totalPages,
        currentPage: pageNumber,
        totalItems,
      },
    }));
  } catch (err:any) {
    await Error.create({
      data: {
        module: "getAllLeaveTypes",
        message: err?.message ?? String(err),
        created_at: getCurrentWIBDate(),
      },
    });
    res.status(500).json({ success: false, message: "Error retrieving leave types data" });
  }
};

export const getLeaveTypeById = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  try {
    const leaveType = await LeaveTypes.findUnique({
      where: { id: Number(id) },
    });
    if (!leaveType) {
      res
        .status(404)
        .json({ success: false, message: "Leave Type not found" });
    } else {
      res.status(200).send(JSONbig.stringify({
        success: true,
        message: "Successfully retrieved leave type data",
        data: { leaveType },
      }));
    }
  } catch (err:any) {
    await Error.create({
      data: {
        module: "getLeaveTypeById",
        message: err?.message ?? String(err),
        created_at: getCurrentWIBDate(),
      },
    });
    res.status(500).json({ success: false, message: "Error retrieving leave type data" });
  }
};

export const createLeaveType = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { title, is_quota_needed } = req.body;

    if (!title) {
      res.status(400).json({
        success: false,
        message: "All fields must be provided and cannot be empty",
      });
      return;
    }

    const newLeaveType = await LeaveTypes.create({
      data: {
        title: title,
        days: 999,
        is_quota_needed: is_quota_needed,
        created_at: getCurrentWIBDate(),
        updated_at: getCurrentWIBDate(),
      },
    });

    res.status(201).send(JSONbig.stringify({
      success: true,
      message: "Leave Type added successfully",
      data: { newLeaveType },
    }));
    return;
  } catch (err:any) {
    await Error.create({
      data: {
        module: "createLeaveType",
        message: err?.message ?? String(err),
        created_at: getCurrentWIBDate(),
      },
    });
    res.status(500).json({ success: false, message: "Error adding leave type data"
  });
    return
  }
};

export const updateLeaveType = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, is_quota_needed, days } = req.body;

    // Validation
    if (!title || title.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: "Title is required and cannot be empty"
      });
      return;
    }

    if (is_quota_needed === undefined || is_quota_needed === null) {
      res.status(400).json({
        success: false,
        message: "Quota selection is required"
      });
      return;
    }

    if (!days && days !== 0) {
      res.status(400).json({
        success: false,
        message: "Days is required"
      });
      return;
    }

    // Check if leave type exists
    const existingLeaveType = await LeaveTypes.findFirst({
      where: {
        id: parseInt(id),
        is_deleted: 0
      }
    });

    if (!existingLeaveType) {
      res.status(404).json({
        success: false,
        message: "Leave type not found"
      });
      return;
    }

    // Check if title already exists (exclude current record)
    const duplicateTitle = await LeaveTypes.findFirst({
      where: {
        title: title.trim(),
        is_deleted: 0,
        NOT: {
          id: parseInt(id)
        }
      }
    });

    if (duplicateTitle) {
      res.status(400).json({
        success: false,
        message: "Leave type with this title already exists"
      });
      return;
    }

    // Update leave type
    const updatedLeaveType = await LeaveTypes.update({
      where: {
        id: parseInt(id)
      },
      data: {
        title: title.trim(),
        is_quota_needed: parseInt(is_quota_needed),
        days: parseInt(days),
        updated_at: new Date()
      }
    });

    res.status(200).json({
      success: true,
      message: "Leave type updated successfully",
      data: updatedLeaveType
    });

  } catch (err:any) {
    await Error.create({
      data: {
        module: "updateLeaveType",
        message: err?.message ?? String(err),
        created_at: getCurrentWIBDate(),
      },
    });
    res.status(500).json({
      success: false,
      message: "Internal server error while updating leave type"
    });
  }
};

export const deleteLeaveType = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  try {
    const deletedLeaveType = await LeaveTypes.update({
      where: { id: Number(id) },
      data: {
        is_deleted: 1
      }
    });
    if (!deletedLeaveType) {
      res
        .status(404)
        .json({ success: false, message: "Leave Type not found" });
    } else {
      res.status(201).json({
        success: true,
        message: "Leave Type deleted successfully",
      });
    }
  } catch (err:any) {
    await Error.create({
      data: {
        module: "deleteLeaveType",
        message: err?.message ?? String(err),
        created_at: getCurrentWIBDate(),
      },
    });
    res.status(500).json({ success: false, message: "Error deleting leave type data" });
  }
};
