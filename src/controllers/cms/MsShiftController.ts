import { Request, Response } from "express";
import { Shift } from "../../models/Table/Satria/Shift";
import { getCurrentWIBDate } from "../../helpers/timeHelper";
import JSONbig from "json-bigint";

// View all shift
export const getAllShift = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      page = "1",
      limit = "10",
      search = "",
      sort = "name",
      order = "asc",
    } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const pageSize = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * pageSize;
    const validSortFields = ["code", "name"];
    const sortField = validSortFields.includes(sort as string)
      ? (sort as string)
      : "name";
    const sortOrder = order === "desc" ? "desc" : "asc";

    const shiftData = await Shift.findMany({
      where: {
        is_deleted: 0,
        OR: [
          { code: { contains: search as string } },
          { name: { contains: search as string } },
        ],
      },
      orderBy: {
        [sortField]: sortOrder,
      },
      skip,
      take: pageSize,
    });

    const formattedShiftData = shiftData.map((shift) => ({
      ...shift,
      in_time: shift.in_time ? shift.in_time.toISOString().slice(11, 16) : null,
      out_time: shift.out_time ? shift.out_time.toISOString().slice(11, 16) : null,
    }));

    const totalItems = await Shift.count({
      where: {
        is_deleted: 0,
        OR: [
          { code: { contains: search as string } },
          { name: { contains: search as string } },
        ],
      },
    });

    const totalPages = Math.ceil(totalItems / pageSize);

    res.status(200).send(JSONbig.stringify({
      success: true,
      message: "Successfully retrieved shift data",
      data: {
        data: formattedShiftData,
        totalPages,
        currentPage: pageNumber,
        totalItems,
      },
    }));
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Error retrieving shift data" });
  }
};

// View shift by ID
export const getShiftById = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  try {
    const shift = await Shift.findUnique({
      where: { id: Number(id) },
    });
    if (!shift) {
      res
        .status(404)
        .json({ success: false, message: "Shift not found" });
    } else {
      res.status(200).send(JSONbig.stringify({
        success: true,
        message: "Successfully retrieved shift data",
        data: { shift },
      }));
    }
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Error retrieving shift data" });
  }
};

// Create shift
export const createShift = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { code, nama, inTime, outTime, gtBeforeIn, gtAfterIn, gtBeforeOut, gtAfterOut } = req.body;
  try {
    const newShift = await Shift.create({
      data: {
        code: code,
        name: nama,
        in_time: inTime ? new Date(`1970-01-01T${inTime}:00.000Z`) : null,
        out_time: outTime ? new Date(`1970-01-01T${outTime}:00.000Z`) : null,
        gt_before_in: gtBeforeIn,
        gt_after_in: gtAfterIn,
        gt_before_out: gtBeforeOut,
        gt_after_out: gtAfterOut,
        created_at: getCurrentWIBDate(),
        updated_at: getCurrentWIBDate(),
      },
    });

    const formattedShiftData = {
      ...newShift,
      in_time: newShift.in_time ? newShift.in_time.toISOString().slice(11, 16) : null,
      out_time: newShift.out_time ? newShift.out_time.toISOString().slice(11, 16) : null,
    };

    res.status(201).send(JSONbig.stringify({
      success: true,
      message: "Shift added successfully",
      data: { formattedShiftData },
    }));
  } catch (err) {
    console.error("Database Error:", err);
    res
      .status(500)
      .json({ success: false, message: "Error adding shift data" });
  }
};

// Update shift
export const updateShift = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const { code, nama, inTime, outTime, gtBeforeIn, gtAfterIn, gtBeforeOut, gtAfterOut } = req.body;
  try {
    const updatedShift = await Shift.update({
      where: { id: Number(id) },
      data: {
        code: code,
        name: nama,
        in_time: inTime ? new Date(`1970-01-01T${inTime}:00.000Z`) : null,
        out_time: outTime ? new Date(`1970-01-01T${outTime}:00.000Z`) : null,
        gt_before_in: gtBeforeIn,
        gt_after_in: gtAfterIn,
        gt_before_out: gtBeforeOut,
        gt_after_out: gtAfterOut,
        updated_at: getCurrentWIBDate(),
      },
    });

    const formattedShiftData = {
      ...updatedShift,
      in_time: updatedShift.in_time ? updatedShift.in_time.toISOString().slice(11, 16) : null,
      out_time: updatedShift.out_time ? updatedShift.out_time.toISOString().slice(11, 16) : null,
    };

    res.status(201).send(JSONbig.stringify({
      success: true,
      message: "Shift updated successfully",
      data: { formattedShiftData },
    }));
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Error updating food data" });
  }
};

// Delete shift
export const deleteShift = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  try {
    const deletedShift = await Shift.update({
      where: { id: Number(id) },
      data: {
        is_deleted: 1
      }
    });
    if (!deletedShift) {
      res
        .status(404)
        .json({ success: false, message: "Shift not found" });
        return;
    } else {
      res.status(201).json({
        success: true,
        message: "Shift deleted successfully",
      });
    }
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Error deleting shift data" });
  }
};
