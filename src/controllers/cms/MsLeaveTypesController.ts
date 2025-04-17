import JSONbig from "json-bigint";
import { Request, Response } from "express";
import { LeaveTypes } from "../../models/Table/Satria/MsLeaveTypes";
import { getCurrentWIBDate, getCurrentWIBTime } from "../../helpers/timeHelper";

export const getAllLeaveTypes = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      page = "1",
      limit = "10",
      search = "",
      sort = "title",
      order = "asc",
    } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const pageSize = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * pageSize;
    const validSortFields = ["title", "days"];
    const sortField = validSortFields.includes(sort as string)
      ? (sort as string)
      : "title";
    const sortOrder = order === "desc" ? "desc" : "asc";
    const searchNumber = parseInt(search as string, 10);

    const leaveTypeData = await LeaveTypes.findMany({
      where: {
        is_deleted: 0,
        OR: [
          { title: { contains: search as string } },
          ...(isNaN(searchNumber) ? [] : [{ days: { equals: searchNumber } }]),
        ],
      },
      orderBy: {
        [sortField]: sortOrder,
      },
      skip,
      take: pageSize,
    });

    const totalItems = await LeaveTypes.count({
      where: {
        is_deleted: 0,
        OR: [
          { title: { contains: search as string } },
          ...(isNaN(searchNumber) ? [] : [{ days: { equals: searchNumber } }]),
        ],
      },
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
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Error retrieving leave types data" });
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
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Error retrieving leave type data" });
  }
};

export const createLeaveType = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
  const { title, days } = req.body;
    if (!title || !days ) {
        res.status(400).json({
        success: false,
        message: "All fields must be provided and cannot be empty",
      });
    }
    const newLeaveType = await LeaveTypes.create({
      data: {
        title: title,
        days: days,
        created_at: getCurrentWIBDate(),
        updated_at: getCurrentWIBDate(),
      },
    });
    res.status(201).send(JSONbig.stringify({
      success: true,
      message: "Leave Type added successfully",
      data: { newLeaveType },
    }));
  } catch (err) {
    console.error("Database Error:", err);
    res
      .status(500)
      .json({ success: false, message: "Error adding leave type data" });
  }
};

export const updateLeveType = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
  const { id } = req.params;
  const { title, days } = req.body;
    if (!title || !days ) {
      res.status(400).json({
      success: false,
      message: "All fields must be provided and cannot be empty",
    });
  }
    const updatedleaveType = await LeaveTypes.update({
      where: { id: Number(id) },
      data: {
        title: title,
        updated_at: getCurrentWIBDate(),
      },
    });
    res.status(201).send(JSONbig.stringify({
      success: true,
      message: "Leave Type updated successfully",
      data: { updatedleaveType },
    }));
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: err });
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
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Error deleting leave type data" });
  }
};
