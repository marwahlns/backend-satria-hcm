import JSONbig from "json-bigint";
import { Request, Response } from "express";
import { TrxShiftEmployee } from "../../models/Table/Satria/TrxShiftEmployee";
import { User } from "../../models/Table/Satria/User";
import { ShiftGroup } from "../../models/Table/Satria/ShiftGroup";
import { getCurrentWIBDate } from "../../helpers/timeHelper";

// export const getAllTrxShiftEmployee = async (
//   req: Request,
//   res: Response
// ): Promise<void> => {
//   try {
//     const {
//       page = "1",
//       limit = "10",
//       search = "",
//       sort = "code",
//       order = "asc",
//     } = req.query;

//     const pageNumber = Number(page) || 1;
//     const pageSize = Number(limit) || 10;
//     const skip = (pageNumber - 1) * pageSize;
//     const validSortFields = [
//       "code",
//       "id_user",
//       "id_shift_group",
//       "valid_from",
//       "valid_to",
//     ];
//     const sortField = validSortFields.includes(sort as string)
//       ? (sort as string)
//       : "code";
//     const sortOrder = order === "desc" ? "desc" : "asc";

//     const shiftEmployees = await TrxShiftEmployee.findMany({
//       where: {
//         is_deleted: 0,
//         OR: [{ code: { contains: search as string } }],
//       },
//       orderBy: { [sortField]: sortOrder },
//       skip,
//       take: pageSize,
//     });

//     const userIds = [
//       ...new Set(
//         shiftEmployees.map((se) => Number(se.id_user)).filter((id) => !isNaN(id))
//       ),
//     ];

//     // Ambil nama user berdasarkan id_user
//     const users = await User.findMany({
//       where: { id: { in: userIds } },
//       select: { id: true, name: true },
//     });

//     const userMap = new Map(users.map((user) => [user.id.toString(), user.name]));

//     const shiftGroupIds: number[] = [
//       ...new Set(
//         shiftEmployees.map((se) => Number(se.id_shift_group)).filter((id) => id)
//       ),
//     ];

//     const shiftGroups = await ShiftGroup.findMany({
//       where: { id: { in: shiftGroupIds } },
//       select: { id: true, nama: true },
//     });

//     const shiftGroupMap = new Map(
//       shiftGroups.map((group) => [group.id.toString(), group.nama])
//     );

//     const shiftEmployeeWithDetails = shiftEmployees.map((se) => ({
//       ...se,
//       id: Number(se.id), // Konversi BigInt ke Number
//       user_name: userMap.get(se.id_user?.toString() || "") || "Unknown",
//       shift_group_name: shiftGroupMap.get(se.id_shift_group?.toString() || "") || "Unknown",
//       valid_from: se.valid_from
//         ? new Date(se.valid_from).toLocaleDateString("en-GB", {
//             day: "numeric",
//             month: "long",
//             year: "numeric",
//           })
//         : null,
//       valid_to: se.valid_to
//         ? new Date(se.valid_to).toLocaleDateString("en-GB", {
//             day: "numeric",
//             month: "long",
//             year: "numeric",
//           })
//         : null,
//     }));

//     const totalItems = await TrxShiftEmployee.count({
//       where: {
//         is_deleted: 0,
//         OR: [{ code: { contains: search as string } }],
//       },
//     });
//     const totalPages = Math.ceil(totalItems / pageSize);
//     // Kirim response dengan JSONbig untuk menangani angka besar (BigInt)
//     res.status(200).send(
//       JSONbig.stringify({
//         success: true,
//         message: "Successfully retrieved Shift Employees data",
//         data: {
//           data: shiftEmployeeWithDetails,
//           totalPages,
//           currentPage: pageNumber,
//           totalItems,
//         },
//       })
//     );
//   } catch (err) {
//     console.error("Error fetching Shift Employees:", err);
//     res.status(500).json({
//       success: false,
//       message: "Error retrieving Shift Employees data",
//     });
//   }
// };

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
    }

    // Ambil tanggal sekarang untuk format kode transaksi
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Cari kode transaksi terakhir yang ada di database
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

    // Tentukan nomor transaksi baru berdasarkan kode terakhir
    let newCodeNumber = 1;
    if (lastShiftEmployee) {
      const lastCode = lastShiftEmployee.code;
      const lastNumber = parseInt(lastCode.replace(`TrxShift-${yearMonth}`, ""), 10);
      newCodeNumber = lastNumber + 1;
    }

    // Simpan setiap `id_user` dalam loop dengan kode transaksi unik
    const shiftEmployees = await Promise.all(
      id_user.map(async (userId: any, index: number) => {
        const newCode = `TrxShift-${yearMonth}${String(newCodeNumber + index).padStart(5, "0")}`;

        return TrxShiftEmployee.create({
          data: {
            code: newCode,
            id_shift_group,
            id_user: userId,
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
    console.log("kokok", id)
    const { code, id_shift_group, id_user, valid_from, valid_to } = req.body;
    console.log("Request Body Data Update:", {
      code,
      id_shift_group,
      id_user,
      valid_from,
      valid_to
    });
    if (!code || !id_shift_group || !id_user || !valid_from || !valid_to) {
      res.status(400).json({
        success: false,
        message: "All fields must be provided and cannot be empty",
      });
    }

    const [yearFrom, monthFrom] = valid_from.split("-").map(Number);
    const [yearTo, monthTo] = valid_to.split("-").map(Number);

    const parsedValidFrom = new Date(yearFrom, monthFrom - 1, 1); // YYYY-MM-DD
    const parsedValidTo = new Date(yearTo, monthTo - 1, 1);

    // Tambahkan console.log untuk debugging
    console.log("Parsed valid_from:", parsedValidFrom);
    console.log("Parsed valid_to:", parsedValidTo);
    const updatedShiftEmployee = await TrxShiftEmployee.update({
      where: { id: Number(id) },
      data: {
        code: code,
        id_shift_group: id_shift_group,
        id_user: id_user,
        valid_from: parsedValidFrom,
        valid_to: parsedValidTo,
        updated_at: getCurrentWIBDate(),
      },
    });
    res.status(201).send(JSONbig.stringify({
      success: true,
      message: "Shift Employee updated successfully",
      data: { updatedShiftEmployee },
    }));
  } catch (err) {
    console.error("Error saat update Shift Employee:", err);
    res.status(500).json({ success: false, message: err });
  }
};

// Delete shift
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