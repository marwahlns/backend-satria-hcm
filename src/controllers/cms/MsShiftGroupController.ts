import { Request, Response } from "express";
import { ShiftGroup } from "../../models/Table/Satria/MsShiftGroup";
import { getCurrentWIBDate } from "../../helpers/timeHelper";
import { PrismaClient as SatriaClient } from "../../../prisma/generated/satria-client";

const prisma = new SatriaClient();

export const getAllShiftGroup = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      page = "1",
      limit = "10",
      search = "",
      sort = "nama",
      order = "asc",
    } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const pageSize = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * pageSize;
    const validSortFields = ["code", "nama"];
    const sortField = validSortFields.includes(sort as string)
      ? (sort as string)
      : "nama";
    const sortOrder = order === "desc" ? "desc" : "asc";

    // Ambil semua shift group
    const shiftGroups = await prisma.ms_shift_group.findMany({
      where: {
        is_deleted: 0,
        OR: [
          { code: { contains: search as string } },
          { nama: { contains: search as string } },
        ],
      },
      orderBy: {
        [sortField]: sortOrder,
      },
      skip,
      take: pageSize,
    });

    // Ambil total jumlah shift group untuk pagination
    const totalItems = await prisma.ms_shift_group.count({
      where: {
        is_deleted: 0,
        OR: [
          { code: { contains: search as string } },
          { nama: { contains: search as string } },
        ],
      },
    });

    const totalPages = Math.ceil(totalItems / pageSize);

    const shiftGroupIds = shiftGroups.map(group => group.code);
    const details = await prisma.ms_detail_shift_group.findMany({
      where: { id_shift_group: { in: shiftGroupIds } },
    });

    const shiftIds = [...new Set(details.map(detail => detail.id_shift))];
    const shifts = await prisma.ms_shift.findMany({
      where: { code: { in: shiftIds } },
    });

    const shiftMap = new Map(shifts.map(shift => [shift.code, shift]));

    const detailsWithShifts = details.map(detail => {
      const shift = shiftMap.get(detail.id_shift); // Simpan hasil get() dalam variabel

      return {
        ...detail,
        shift_name: shift?.name || "Unknown",
        in_time: shift?.in_time ? new Date(shift.in_time).toISOString().slice(11, 16) : null,
        out_time: shift?.out_time ? new Date(shift.out_time).toISOString().slice(11, 16) : null,
      };
    });


    const shiftGroupWithDetails = shiftGroups.map(group => ({
      ...group,
      details: detailsWithShifts.filter(detail => detail.id_shift_group === group.code),
    }));

    res.status(200).json({
      success: true,
      message: "Successfully retrieved shift group data",
      data: {
        data: shiftGroupWithDetails,
        totalPages,
        currentPage: pageNumber,
        totalItems,
      },
    });
  } catch (err) {
    console.error("Database Error:", err);
    res
      .status(500)
      .json({ success: false, message: "Error retrieving shift group data" });
  }
};

export const createShiftGroup = async (
    req: Request, 
    res: Response
): Promise<void> => {
  const { code, nama, flag_shift, details } = req.body;

  try {
    const newShiftGroup = await prisma.$transaction(async (prisma) => {
      // 1. Simpan ke tabel ms_shift_group
      const shiftGroup = await ShiftGroup.create({
        data: {
          code,
          nama,
          flag_shift,
          created_at: getCurrentWIBDate(),
          updated_at: getCurrentWIBDate(),
        },
      });

      // 2. Simpan ke tabel ms_detail_shift_group (jika ada detail shift)
      if (details && details.length > 0) {
        await ShiftGroup.createMany({
          data: details.map((detail: { index_day: string; id_shift: string }) => ({
            index_day: detail.index_day,
            code: shiftGroup.code,
            id_shift_group: shiftGroup.code,
            id_shift: detail.id_shift,
            created_at: getCurrentWIBDate(),
            updated_at: getCurrentWIBDate(),
          })),
        });
      }

      return shiftGroup;
    });

    res.status(201).json({
      success: true,
      message: "Shift group and details added successfully",
      data: { newShiftGroup },
    });
  } catch (err) {
    console.error("Database Error:", err);
    res.status(500).json({ success: false, message: "Error adding shift group data" });
  }
};

export const updateShiftGroup = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { code, nama, flag_shift, details } = req.body;

  try {
      const updatedShiftGroup = await prisma.$transaction(async (prisma) => {
          // 1. Update ShiftGroup utama di ms_shift_group
          const shiftGroup = await ShiftGroup.update({
              where: { id: Number(id) },
              data: {
                  code,
                  nama,
                  flag_shift,
                  updated_at: getCurrentWIBDate(),
              },
          });

          // 2. Hapus semua data lama di ms_detail_shift_group berdasarkan id_shift_group
          await ShiftGroup.deleteMany({
              where: { id_shift_group: shiftGroup.code },
          });

          // 3. Simpan kembali `details` baru seperti di createShiftGroup
          if (details && details.length > 0) {
              await ShiftGroup.createMany({
                  data: details.map((detail: { index_day: string; id_shift: string }) => ({
                      index_day: detail.index_day,
                      code: shiftGroup.code,
                      id_shift_group: shiftGroup.code,
                      id_shift: detail.id_shift,
                      created_at: getCurrentWIBDate(),
                      updated_at: getCurrentWIBDate(),
                  })),
              });
          }

          return {
              id: shiftGroup.id,
              id_shift_group_sap: 0,  // Jika ada mapping ke SAP, tambahkan di sini
              code: shiftGroup.code,
              nama: shiftGroup.nama,
              flag_shift: shiftGroup.flag_shift,
              created_by: shiftGroup.created_by ?? null,
              updated_by: shiftGroup.updated_by ?? null,
              created_at: shiftGroup.created_at,
              updated_at: shiftGroup.updated_at,
              is_deleted: shiftGroup.is_deleted ?? 0, // Pastikan tidak null
          };
      });

      res.status(200).json({
          success: true,
          message: "Shift group and details updated successfully",
          data: { newShiftGroup: updatedShiftGroup },
      });
  } catch (err) {
      console.error("Database Error:", err);
      res.status(500).json({
          success: false,
          message: "Error updating shift group",
      });
  }
};

export const deleteShiftGroup = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  try {
    const deletedShift = await ShiftGroup.update({
      where: { id: Number(id) },
      data: {
        is_deleted: 1
      }
    });
    if (!deletedShift) {
      res
        .status(404)
        .json({ success: false, message: "Shift not found" });
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
