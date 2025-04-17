import JSONbig from "json-bigint";
import { Request, Response } from "express";
import { Worklocation } from "../../models/Table/Satria/MsWorklocation";
import { getCurrentWIBDate } from "../../helpers/timeHelper";

export const getAllWorklocation = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      page = "1",
      limit = "10",
      search = "",
      sort = "worklocation_code",
      order = "asc",
    } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const pageSize = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * pageSize;
    const validSortFields = ["worklocation_code", "worklocation_name", "worklocation_lat_long"];
    const sortField = validSortFields.includes(sort as string)
      ? (sort as string)
      : "worklocation_code";
    const sortOrder = order === "desc" ? "desc" : "asc";

    const WorklocationData = await Worklocation.findMany({
      where: {
        is_deleted: 0,
        OR: [
          { worklocation_code: { contains: search as string } },
          { worklocation_name: { contains: search as string } },
          { worklocation_lat_long: { contains: search as string } },
        ],
      },
      orderBy: {
        [sortField]: sortOrder,
      },
      skip,
      take: pageSize,
    });

    const totalItems = await Worklocation.count({
      where: {
        OR: [
            { worklocation_code: { contains: search as string } },
            { worklocation_name: { contains: search as string } },
            { worklocation_lat_long: { contains: search as string } },
        ],
      },
    });

    const totalPages = Math.ceil(totalItems / pageSize);
    res.status(200).send(JSONbig.stringify({
      success: true,
      message: "Successfully retrieved worklocations data",
      data: {
        data: WorklocationData,
        totalPages,
        currentPage: pageNumber,
        totalItems,
      },
    }));
  } catch (err) {
    console.log(err)
    res
      .status(500)
      .json({ success: false, message: "Error retrieving worklocations data" });
  }
};

export const getWorklocationById = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  try {
    const worklocation = await Worklocation.findUnique({
      where: { worklocation_id: Number(id) },
    });
    if (!worklocation) {
      res
        .status(404)
        .json({ success: false, message: "Worklocation not found" });
    } else {
      res.status(200).send(JSONbig.stringify({
        success: true,
        message: "Successfully retrieved worklocation data",
        data: { worklocation },
      }));
    }
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Error retrieving worklocation data" });
  }
};

export const createWorklocation = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { location_code, location_name, location_lat_long } = req.body;
    if (!location_code || !location_name || !location_lat_long) {
      res.status(400).json({
        success: false,
        message: "All fields must be provided and cannot be empty",
      });
    }
    const newWorklocation = await Worklocation.create({
      data: {
        worklocation_code: location_code,
        worklocation_name: location_name,
        worklocation_lat_long: location_lat_long,
        is_deleted: 0,
        created_at: getCurrentWIBDate(),
        updated_at: getCurrentWIBDate(),
      },
    });
    res.status(201).send(JSONbig.stringify({
      success: true,
      message: "Worklocation added successfully",
      data: { newWorklocation },
    }));
  } catch (err) {
    console.error("Database Error:", err); // Log error ke conso
    res
      .status(500)
      .json({ success: false, message: "Error adding worklocation data" });
  }
};

export const updateWorklocation = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { location_name, location_lat_long } = req.body;
    if (!location_name || !location_lat_long) {
      res.status(400).json({
        success: false,
        message: "All fields must be provided and cannot be empty",
      });
    }
    const updatedWorklocation = await Worklocation.update({
      where: { worklocation_id: Number(id) },
      data: {
        worklocation_name: location_name,
        worklocation_lat_long: location_lat_long,
        updated_at: getCurrentWIBDate(),
      },
    });
    res.status(201).send(JSONbig.stringify({
      success: true,
      message: "Worklocation updated successfully",
      data: { updatedWorklocation },
    }));
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: err });
  }
};

export const deleteWorklocation = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  try {
    const deletedWorklocation = await Worklocation.update({
      where: { worklocation_id: Number(id) },
      data: {
        is_deleted: 1
      }
    });
    if (!deletedWorklocation) {
      res
        .status(404)
        .json({ success: false, message: "Worklocation not found" });
    } else {
      res.status(201).json({
        success: true,
        message: "Worklocation deleted successfully",
      });
    }
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Error deleting worklocation data" });
  }
};
