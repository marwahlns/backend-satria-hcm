import { Request, Response } from "express";
import { Attendance } from "../../models/Table/Satria/TrxAttendance";
import { TrxShiftEmployee } from "../../models/Table/Satria/TrxShiftEmployee";
import { getCurrentWIBDate } from "../../helpers/timeHelper";
import JSONbig from "json-bigint";
import { Shift } from "../../models/Table/Satria/MsShift";
import multer from 'multer';

// Setup multer storage untuk file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); 
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });




export const getAllAttendance = async (
  req: Request & { user?: { nrp: string; shift_id: string } },
  res: Response
): Promise<void> => {
  try {
    const {
      page = "1",
      limit = "10",
      search = "",
      sort = "created_at",
      order = "desc",
    } = req.query;

    const userNrp = req.user?.nrp;
    const shiftId = req.user?.shift_id;
    const isAdmin = userNrp === "P0120001";
    const pageNumber = parseInt(page as string, 10);
    const pageSize = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * pageSize;
    const sortOrder = order === "asc" ? "asc" : "desc";
    const validSortFields = ["created_at", "in_time", "out_time", "subcont", "shift_code"];
    const sortField = validSortFields.includes(sort as string) ? (sort as string) : "created_at";

    const totalItems = await Attendance.count({
      where: {
        subcont: {
          contains: search as string,
        },
      },
    });

    const data = await Attendance.findMany({
      where: {
        subcont: {
          contains: search as string,
        },
      },
      orderBy: {
        [sortField]: sortOrder,
      },
      skip,
      take: pageSize,
    });

    let canCheckIn = false;
    let canCheckOut = false;

    if (shiftId) {
      const shift = await Shift.findFirst({
        where: { code: shiftId },
      });

      if (shift) {
        const now = getCurrentWIBDate(); // Harus dalam WIB juga ya

        const inTimeToday = setTimeToToday(new Date(shift.in_time!));
        const outTimeToday = setTimeToToday(new Date(shift.out_time!));

        const inStart = new Date(inTimeToday);
        inStart.setMinutes(inStart.getMinutes() - shift.gt_before_in);

        const inEnd = new Date(inTimeToday);
        inEnd.setMinutes(inEnd.getMinutes() + shift.gt_after_in);

        const outStart = new Date(outTimeToday);
        outStart.setMinutes(outStart.getMinutes() - shift.gt_before_out);

        const outEnd = new Date(outTimeToday);
        outEnd.setMinutes(outEnd.getMinutes() + shift.gt_after_out);

        console.log("startIn", inStart);
        console.log("endIn", inEnd);
        console.log("startOut", outStart);
        console.log("endOut", outEnd);

        canCheckIn = now >= inStart && now <= inEnd;
        canCheckOut = now >= outStart && now <= outEnd;
        }


    
    }

    const totalPages = Math.ceil(totalItems / pageSize);

    res.status(200).send(JSONbig.stringify({
      success: true,
      message: "Successfully retrieved attendance data",
      data: {
        data,
        totalPages,
        currentPage: pageNumber,
        totalItems,
        canCheckIn,
        canCheckOut,
      },
    }));
  } catch (err) {
    console.error("Error fetching attendance:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

function setTimeToToday(sourceTime: Date): Date {
  const today = new Date();
  const result = new Date(today);
  result.setHours(sourceTime.getHours(), sourceTime.getMinutes(), 0, 0);
  return result;
}

export const checkInCheckOutAttendance = async (
  req: Request & { user?: { nrp: string; shift_id: string } },
  res: Response
): Promise<void> => {
  let { longitude, latitude, time, foto } = req.body;
  const userNrp = req.user?.nrp;

  if (!userNrp) {
    res.status(400).json({ success: false, message: "NRP is required." });
    return;
  }

  try {
    // Cek shift employee
    const shiftEmp = await TrxShiftEmployee.findFirst({
      where: { id_user: userNrp },
    });

    if (!shiftEmp) {
      res.status(404).json({ success: false, message: "Shift group not found for user." });
      return;
    }

    const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const todayIndex = new Date().getDay();
    const todayDayName = daysOfWeek[todayIndex];

    const detailShift = await TrxShiftEmployee.detailFindFirst({
      where: {
        id_shift_group: shiftEmp.id_shift_group,
        index_day: todayDayName,
      },
    });

    if (!detailShift) {
      res.status(404).json({ success: false, message: "No shift scheduled for today." });
      return;
    }

    const shift = await Shift.findFirst({ where: { code: detailShift.id_shift } });

    if (!shift) {
      res.status(404).json({ success: false, message: "Shift not found." });
      return;
    }

    const shift_code = shift.code;
    const now = getCurrentWIBDate();

    if (!time) {
      res.status(400).json({ success: false, message: "Time is required." });
      return;
    }

    const inTimeToday = new Date(shift.in_time!);
    const outTimeToday = new Date(shift.out_time!);

    const inStart = new Date(inTimeToday.getTime());
    inStart.setMinutes(inStart.getMinutes() - shift.gt_before_in);

    const inEnd = new Date(inTimeToday.getTime());
    inEnd.setMinutes(inEnd.getMinutes() + shift.gt_after_in);

    const outStart = new Date(outTimeToday.getTime());
    outStart.setMinutes(outStart.getMinutes() - shift.gt_before_out);

    const outEnd = new Date(outTimeToday.getTime());
    outEnd.setMinutes(outEnd.getMinutes() + shift.gt_after_out);

    // Logging
    console.log("📌 Waktu input:", time);
    console.log("🕒 Boleh in dari:", inStart);
    console.log("🕒 Boleh in sampai:", inEnd);

    // Cek apakah sudah pernah absen hari ini
    const existingAttendance = await Attendance.findFirst({
      where: {
        subcont: userNrp,
        shift_code,
        in_time: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });

    if (!existingAttendance) {
      // Check-in
      if (time < inStart || time > inEnd) {
        res.status(403).json({
          success: false,
          message: "You are not within the allowed check-in time range.",
        });
        return;
      }

      const newAttendance = await Attendance.create({
        data: {
          subcont: userNrp,
          shift_code,
          in_time: time,
          longitude_in: longitude,
          latitude_in: latitude,
          foto_in: foto,
          is_ovt: 0,
          is_happy: 1,
          checked_by: userNrp,
          checked_at: now,
          created_at: now,
          updated_at: now,
        },
      });

      res.status(201).json({
        success: true,
        message: "Check-in successfully recorded.",
        data: newAttendance,
      });
    } else {
      // Check-out
      const updatedAttendance = await Attendance.update({
        where: { id: existingAttendance.id },
        data: {
          out_time: time,
          longitude_out: longitude,
          latitude_out: latitude,
          foto_out: foto,
          work_metode: "WFO",
          is_ovt: 0,
          is_happy: 1,
          checked_by: userNrp,
          checked_at: now,
          updated_at: now,
        },
      });

      res.status(200).json({
        success: true,
        message: "Check-out successfully recorded.",
        data: updatedAttendance,
      });
    }
  } catch (error) {
    console.error("❌ Error attendance:", error);
    res.status(500).json({
      success: false,
      message: "Error recording attendance.",
    });
  }
};



