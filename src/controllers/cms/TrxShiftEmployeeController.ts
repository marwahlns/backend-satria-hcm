import JSONbig from "json-bigint";
import { Request, Response } from "express";
import { TrxShiftEmployee } from "../../models/Table/Satria/TrxShiftEmployee";
import { User } from "../../models/Table/Satria/MsUser";
import { ShiftGroup } from "../../models/Table/Satria/MsShiftGroup";
import { getCurrentWIBDate } from "../../helpers/timeHelper";

export const getAllTrxShiftEmployee = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      page = "1",
      limit = "10",
      search = "",
      sort = "code",
      order = "asc",
    } = req.query;

    const pageNumber = Number(page) || 1;
    const pageSize = Number(limit) || 10;
    const skip = (pageNumber - 1) * pageSize;
    const validSortFields = [
      "code",
      "id_user",
      "id_shift_group",
      "valid_from",
      "valid_to",
    ];
    const sortField = validSortFields.includes(sort as string)
      ? (sort as string)
      : "code";
    const sortOrder = order === "desc" ? "desc" : "asc";

    const shiftEmployees = await TrxShiftEmployee.findMany({
      where: {
        is_deleted: 0,
        OR: [{ code: { contains: search as string } }],
      },
      orderBy: { [sortField]: sortOrder },
      skip,
      take: pageSize,
    });

    // Ambil id_user unik dari hasil query (hindari undefined/null)
    const userIds = [
      ...new Set(
        shiftEmployees
          .map((se) => se.id_user)
          .filter((id) => id !== undefined && id !== null)
      ),
    ];

    // Ambil nama user berdasarkan personal_number
    const users = await User.findMany({
      where: { personal_number: { in: userIds } },
      select: { personal_number: true, name: true },
    });

    const userMap = new Map(
      users
        .filter((user) => user.personal_number !== null)
        .map((user) => [user.personal_number!.toString(), user.name])
    );

    const shiftGroupIds = [
      ...new Set(
        shiftEmployees
          .map((se) => se.id_shift_group)
          .filter((id) => id !== undefined && id !== null)
      ),
    ];

    const shiftGroups = await ShiftGroup.findMany({
      where: { code: { in: shiftGroupIds } },
      select: { code: true, nama: true },
    });

    const shiftGroupMap = new Map(
      shiftGroups
        .map((group) => [group.code.toString(), group.nama])
    );

    // Mapping shiftEmployees dengan user_name dan shift_group_name
    const shiftEmployeeWithDetails = shiftEmployees.map((se) => ({
      ...se,
      id: Number(se.id), // Konversi BigInt ke Number
      user_name: userMap.get(se.id_user?.toString() || "") || "Unknown",
      shift_group_name: shiftGroupMap.get(se.id_shift_group?.toString() || "") || "Unknown",
      valid_from: se.valid_from
        ? new Date(se.valid_from).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
        : null,
      valid_to: se.valid_to
        ? new Date(se.valid_to).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
        : null,
    }));

    const totalItems = await TrxShiftEmployee.count({
      where: {
        is_deleted: 0,
        OR: [{ code: { contains: search as string } }],
      },
    });
    const totalPages = Math.ceil(totalItems / pageSize);

    res.status(200).send(
      JSONbig.stringify({
        success: true,
        message: "Successfully retrieved Shift Employees data",
        data: {
          data: shiftEmployeeWithDetails,
          totalPages,
          currentPage: pageNumber,
          totalItems,
        },
      })
    );
  } catch (err) {
    console.error("Error fetching Shift Employees:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving Shift Employees data",
    });
  }
};

export const createShiftEmployee = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id_shift_group, id_user, valid_from, valid_to } = req.body;

    if (!id_shift_group || !Array.isArray(id_user) || id_user.length === 0) {
      res.status(400).json({
        success: false,
        message: "All fields must be provided, and id_user must be an array",
      });
      return;
    }

    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;

    const lastShiftEmployee = await TrxShiftEmployee.findFirst({
      where: {
        code: {
          startsWith: `TrxShift-${yearMonth}`,
        },
      },
      orderBy: {
        code: "desc",
      },
    });

    let newCodeNumber = 1;
    if (lastShiftEmployee) {
      const lastCode = lastShiftEmployee.code;
      const lastNumber = parseInt(lastCode.replace(`TrxShift-${yearMonth}`, ""), 10);
      newCodeNumber = lastNumber + 1;
    }

    const shiftEmployees = await Promise.all(
      id_user.map(async (userId: any, index: number) => {
        // Cek transaksi terakhir untuk user ini
        const lastShiftByUser = await TrxShiftEmployee.findFirst({
          where: {
            id_user: userId,
          },
          orderBy: {
            flag_shift: "desc",
          },
        });

        const lastFlag = lastShiftByUser?.flag_shift ?? 0;
        const nextFlagShift = lastFlag + 1;

        const newCode = `TrxShift-${yearMonth}${String(newCodeNumber + index).padStart(5, "0")}`;

        return TrxShiftEmployee.create({
          data: {
            code: newCode,
            id_shift_group,
            id_user: userId,
            flag_shift: nextFlagShift,
            valid_from: new Date(valid_from),
            valid_to: new Date(valid_to),
            created_at: getCurrentWIBDate(),
            updated_at: getCurrentWIBDate(),
          },
        });
      })
    );

    res.status(201).send(
      JSONbig.stringify({
        success: true,
        message: "Shift Employees added successfully",
        data: shiftEmployees,
      })
    );
  } catch (err) {
    console.error("Database Error:", err);
    res.status(500).json({
      success: false,
      message: "Error adding Shift Employee data",
    });
  }
};

export const updateShiftEmployee = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { id_shift_group, valid_from, valid_to } = req.body;

    if (!id_shift_group || !valid_from || !valid_to) {
      res.status(400).json({
        success: false,
        message: "All fields must be provided and cannot be empty",
      });
    }

    const updatedShiftEmployee = await TrxShiftEmployee.update({
      where: { id: Number(id) },
      data: {
        id_shift_group: id_shift_group,
        valid_from: new Date(valid_from),
        valid_to: new Date(valid_to),
        updated_at: getCurrentWIBDate(),
      },
    });
    res.status(201).send(JSONbig.stringify({
      success: true,
      message: "Transaction shift updated successfully",
      data: { updatedShiftEmployee },
    }));
  } catch (err) {
    console.error("Error while update transaction shift:", err);
    res.status(500).json({ success: false, message: err });
  }
};

export const deleteShiftEmployee = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  try {
    const deletedShiftEmployee = await TrxShiftEmployee.update({
      where: { id: Number(id) },
      data: {
        is_deleted: 1
      }
    });
    if (!deletedShiftEmployee) {
      res
        .status(404)
        .json({ success: false, message: "Shift Employee not found" });
    } else {
      res.status(201).json({
        success: true,
        message: "Shift Employee deleted successfully",
      });
    }
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Error deleting Shift Employee data" });
  }
};