import { Request, Response } from "express";
import { Attendance } from "../../models/Table/Satria/TrxAttendance";
import { TrxShiftEmployee } from "../../models/Table/Satria/TrxShiftEmployee";
import { getCurrentWIBDate } from "../../helpers/timeHelper";
import { getDistanceMeters } from "../../helpers/geo";
import JSONbig from "json-bigint";
import { Shift } from "../../models/Table/Satria/MsShift";
import { TrxLeave } from "../../models/Table/Satria/TrxLeave";
import { TrxOvertime } from "../../models/Table/Satria/TrxOvertime";
import { TrxOfficialTravel } from "../../models/Table/Satria/TrxOfficialTravel";
import { User } from "../../models/Table/Satria/MsUser";
import ExcelJS from "exceljs";
import * as fs from 'fs';

export const getAttendanceReport = async (
  req: Request & { user?: { nrp: string; name: string; departement: string } },
  res: Response
): Promise<void> => {
  try {
    const {
      page = "1",
      limit = "5",
      sort = "",
      order = "asc",
      month = new Date().getMonth() + 1,
      year = new Date().getFullYear(),
      export: exportExcel = "false",
    } = req.query;

    const userNrp = req.user?.nrp;
    const userName = req.user?.name;
    const userDepartment = req.user?.departement;
    if (!userNrp) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const pageNumber = parseInt(page as string, 10);
    const pageSize = parseInt(limit as string, 10);
    const shouldExport = exportExcel === "true";

    // Convert month to 0-based index for Date constructor
    const selectedYear = parseInt(year as string, 10);
    const selectedMonth = parseInt(month as string, 10) - 1;

    const startDate = new Date(selectedYear, selectedMonth, 1);
    const endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999);

    const totalDaysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

    const attendanceData = await Attendance.findMany({
      where: {
        subcont: userNrp,
        in_time: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        in_time: "asc",
      },
    });

    // Create a map for quick lookup of attendance by date
    const attendanceMap = new Map();
    attendanceData.forEach((record) => {
      if (record.in_time) {
        const dateKey = new Date(record.in_time).getUTCDate();
        attendanceMap.set(dateKey, record);
      }
    });

    const getDayLabel = (date: Date): string => {
      const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
      return days[date.getDay()];
    };

    const getMonthName = (monthIndex: number): string => {
      const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
      return months[monthIndex];
    };

    const getDayStatus = (date: Date): string => {
      const dayOfWeek = date.getDay();
      return (dayOfWeek === 0 || dayOfWeek === 6) ? 'H' : 'W'; // H for Holiday/Weekend, W for Workday
    };

    // Generate complete month data (all days)
    const completeMonthData = [];
    let totalDataWithAttendance = 0;
    let totalLateIn = 0;

    const [totalLeave, totalOfficialTravel] = await Promise.all([
      TrxLeave.count({
        where: {
          user: userNrp,
          status_id: 3
        }
      }),
      TrxOfficialTravel.count({ where: { user: userNrp } }),
    ]);

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const currentDate = new Date(selectedYear, selectedMonth, day);
      const dayLabel = getDayLabel(currentDate);
      const dayStatus = getDayStatus(currentDate);
      const dateAbsen = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${day}`;
      const dateAbsenDay = `${day} ${getMonthName(selectedMonth)} ${selectedYear}`;

      if (attendanceMap.has(day)) {
        const actualRecord = attendanceMap.get(day);
        totalDataWithAttendance++;

        // Check if late in (you may need to adjust this logic based on your business rules)
        if (actualRecord.is_late) {
          totalLateIn++;
        }

        completeMonthData.push({
          no: day,
          ...actualRecord,
          day_label: dayLabel,
          date_absen: dateAbsen,
          date_absen_day: dateAbsenDay,
          day_status: dayStatus,
        });
      } else {
        // Create placeholder for missing day
        completeMonthData.push({
          no: day,
          id: "-",
          remote_addr_in: "-",
          longitude_in: "-",
          latitude_in: "-",
          address_in: "-",
          subcont: "-",
          client: "-",
          in_time: "-",
          out_time: "-",
          revice_in_time: "-",
          revice_out_time: "-",
          remote_addr_out: "-",
          longitude_out: "-",
          latitude_out: "-",
          address_out: "-",
          work_metode: "-",
          foto_in: "-",
          foto_out: "-",
          note: "-",
          checked_by: "-",
          checked_at: "-",
          reject_reason: "-",
          is_ovt: "-",
          is_happy: "-",
          flag: "-",
          created_by: "-",
          updated_by: "-",
          created_at: "-",
          updated_at: "-",
          day_label: dayLabel,
          is_late: "-",
          date_absen: dateAbsen,
          date_absen_day: dateAbsenDay,
          day_status: dayStatus,
        });
      }
    }

    // Apply sorting if needed
    if (order === "desc") {
      completeMonthData.reverse();
    }

    if (shouldExport) {
      const overtimeData = await TrxOvertime.findMany({
        where: {
          user: userNrp,
          status_id: 3,
          check_in_ovt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          check_in_ovt: "asc",
        },
      });

      const overtimeMap = new Map();
      overtimeData.forEach((record) => {
        if (record.check_in_ovt) {
          const dateKey = new Date(record.check_in_ovt).getUTCDate();
          overtimeMap.set(dateKey, record);
        }
      });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Attendance Report');

      // Header Perusahaan
      const imageBuffer = fs.readFileSync('uploads/logo.png');
      const imageId = workbook.addImage({
        buffer: imageBuffer,
        extension: 'png',
      });
      worksheet.addImage(imageId, {
        tl: { col: 0, row: 0 },
        ext: { width: 206, height: 55 },
        editAs: 'oneCell',
      });

      // Judul
      worksheet.mergeCells('A4:H4');
      worksheet.getCell('A4').value = 'Attendance Report';
      worksheet.getCell('A4').font = { size: 16, bold: true };
      worksheet.getCell('A4').alignment = { horizontal: 'center' };

      // Informasi karyawan
      worksheet.addRow(['NRP .', userNrp, '', 'Name .', userName]);
      worksheet.addRow(['DEPT .', userDepartment]);
      worksheet.addRow(['MONTH .', `${getMonthName(selectedMonth)} ${selectedYear}`]);
      worksheet.getCell('A5').font = { bold: true };
      worksheet.getCell('A6').font = { bold: true };
      worksheet.getCell('A7').font = { bold: true };
      worksheet.getCell('D5').font = { bold: true };
      worksheet.addRow([]);

      // Ringkasan
      worksheet.mergeCells('A9:B9');
      worksheet.getCell('A9').value = 'PRESENCE';
      worksheet.mergeCells('A10:B10');
      worksheet.getCell('A10').value = totalDataWithAttendance;

      worksheet.mergeCells('C9:D9');
      worksheet.getCell('C9').value = 'LATE IN';
      worksheet.mergeCells('C10:D10');
      worksheet.getCell('C10').value = totalLateIn;

      worksheet.mergeCells('E9:F9');
      worksheet.getCell('E9').value = 'LEAVE';
      worksheet.mergeCells('E10:F10');
      worksheet.getCell('E10').value = totalLeave;

      worksheet.mergeCells('G9:H9');
      worksheet.getCell('G9').value = 'OFFICIAL TRAVEL';
      worksheet.mergeCells('G10:H10');
      worksheet.getCell('G10').value = totalOfficialTravel;

      // Header tabel
      worksheet.mergeCells('A12:A13');
      worksheet.getCell('A12').value = 'Date';

      worksheet.mergeCells('B12:C12');
      worksheet.getCell('B12').value = 'ATTENDANCE';
      worksheet.getCell('B13').value = 'In';
      worksheet.getCell('C13').value = 'Out';

      worksheet.mergeCells('D12:E12');
      worksheet.getCell('D12').value = 'OVERTIME';
      worksheet.getCell('D13').value = 'In';
      worksheet.getCell('E13').value = 'Out';

      worksheet.mergeCells('F12:H13');
      worksheet.getCell('F12').value = 'NOTES';

      const cellsToCenter = ['A9', 'A10', 'A12', 'B12', 'B13', 'C13', 'D13', 'E13', 'D12', 'F12', 'C9', 'C10', 'E9', 'E10', 'G9', 'G10'];
      cellsToCenter.forEach(cell => {
        worksheet.getCell(cell).alignment = { horizontal: 'center', vertical: 'middle' };
      });

      for (let row = 9; row <= 10; row++) {
        for (let col = 1; col <= 7; col++) {
          const cell = worksheet.getCell(row, col);
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        }
      }

      // Isi data kehadiran
      for (let day = 1; day <= totalDaysInMonth; day++) {
        const currentDate = new Date(selectedYear, selectedMonth, day);
        const attendanceRecord = attendanceMap.get(day);
        const overtimeRecord = overtimeMap.get(day);

        const inTime = attendanceRecord?.in_time
          ? new Date(attendanceRecord.in_time).toISOString().slice(11, 16)
          : "-";
        const outTime = attendanceRecord?.out_time
          ? new Date(attendanceRecord.out_time).toISOString().slice(11, 16)
          : "-";
        const overtimeIn = overtimeRecord?.check_in_ovt
          ? new Date(overtimeRecord.check_in_ovt).toISOString().slice(11, 16)
          : "-";
        const overtimeOut = overtimeRecord?.check_out_ovt
          ? new Date(overtimeRecord.check_out_ovt).toISOString().slice(11, 16)
          : "-";
        const notes = attendanceRecord?.note || "";

        const row = worksheet.addRow([day, inTime, outTime, overtimeIn, overtimeOut, notes]);
        worksheet.mergeCells(`F${row.number}:H${row.number}`);
        worksheet.getCell(`F${row.number}`).value = notes;

        if (attendanceRecord?.is_late === 1) {
          const inCell = row.getCell(2);
          inCell.font = { color: { argb: 'FF0000' } };
        }

        const dayStatus = getDayStatus(currentDate);
        if (dayStatus === 'H') {
          row.eachCell((cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'D3D3D3' },
            };
          });
        }
      }

      // Setelah semua data kehadiran ditambahkan
      const startRow = 12;
      const endRow = 14 + totalDaysInMonth - 1; // 2 baris header + total data

      const startCol = 1; // Kolom A
      const endCol = 8;   // Kolom H

      for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
          const cell = worksheet.getCell(row, col);
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      }

      // Buffer dan kirim file
      const buffer = await workbook.xlsx.writeBuffer();

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=Attendance_Report_${getMonthName(selectedMonth)}_${selectedYear}.xlsx`);
      res.send(buffer);
    }

    const totalItems = completeMonthData.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (pageNumber - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = completeMonthData.slice(startIndex, endIndex);

    const response = {
      message: "true",
      data: {
        data: paginatedData,
        totalPages,
        totalItems,
        currentPage: pageNumber
      },
      total_day: totalDaysInMonth,
      total_data: totalDataWithAttendance,
      total_leave: totalLeave,
      total_data_late_in: totalLateIn
    };

    res.status(200).send(JSONbig.stringify(response));
  } catch (err) {
    console.error("Error fetching attendance:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

function setTimeToDay(time: Date, day: Date, addDay = 0) {
  const newDate = new Date(day);
  newDate.setUTCDate(newDate.getUTCDate() + addDay);
  newDate.setUTCHours(time.getUTCHours(), time.getUTCMinutes(), time.getUTCSeconds(), 0);
  return newDate;
}

export const getAttendanceToday = async (req: Request & { user?: { nrp: string } }, res: Response): Promise<void> => {
  try {
    const userNrp = req.user?.nrp;
    if (!userNrp) throw new Error("User not found");

    const now = getCurrentWIBDate();
    console.log("==========================")
    console.log("now : ", now)
    const today = new Date(now);
    console.log("today : ", today)
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    console.log("yesterday : ", yesterday)

    const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const todayDayName = daysOfWeek[today.getUTCDay()];
    console.log("todayDayName : ", todayDayName)
    const yesterdayDayName = daysOfWeek[yesterday.getUTCDay()];
    console.log("yesterdayDayName : ", yesterdayDayName)

    const user = await User.findFirst({
      where: {
        personal_number: userNrp,
      },
      select: {
        worklocation_lat_long: true,
        latlon_distance: true,
      }
    })

    const shiftEmp = await TrxShiftEmployee.findFirst({
      where: {
        is_deleted: 0,
        id_user: userNrp,
        valid_from: { lte: today },
        valid_to: { gte: today },
      },
      orderBy: { flag_shift: 'desc' },
    });

    if (!shiftEmp) {
      res.status(200).json({ success: false, message: "Shift not found" });
      return;
    }

    // Ambil shift hari ini dan kemarin
    const [shiftToday, shiftYesterday] = await Promise.all([
      TrxShiftEmployee.detailFindFirst({
        where: {
          id_shift_group: shiftEmp.id_shift_group,
          index_day: todayDayName,
        },
        include: { MsShift: true },
      }),
      TrxShiftEmployee.detailFindFirst({
        where: {
          id_shift_group: shiftEmp.id_shift_group,
          index_day: yesterdayDayName,
        },
        include: { MsShift: true },
      }),
    ]);

    let shiftDetail = shiftToday;
    let shiftDay = today;
    let usedYesterdayShift = false;

    if (shiftYesterday?.MsShift?.flag_shift === 1) {
      const yShift = shiftYesterday.MsShift;
      const yIn = setTimeToDay(new Date(yShift.in_time!), yesterday);
      const yOut = setTimeToDay(new Date(yShift.out_time!), yesterday, 1);

      const yStartIn = new Date(yIn);
      yStartIn.setMinutes(yStartIn.getMinutes() - yShift.gt_before_in);

      const yEndOut = new Date(yOut);
      yEndOut.setMinutes(yEndOut.getMinutes() + yShift.gt_after_out);

      if (now >= yStartIn && now <= yEndOut) {
        shiftDetail = shiftYesterday;
        shiftDay = yesterday;
        usedYesterdayShift = true;
      }
    }

    if (!shiftDetail || !shiftDetail.MsShift) {
      res.status(404).json({ success: false, message: "Shift detail not found" });
      return;
    }

    const shift = shiftDetail.MsShift;
    console.log("SHIFT DAY : ", shiftDay)
    const inTime = setTimeToDay(new Date(shift.in_time!), shiftDay);
    console.log("inTime : ", inTime)
    const outTime = setTimeToDay(new Date(shift.out_time!), shiftDay, shift.flag_shift === 1 ? 1 : 0);
    console.log("outTime : ", outTime)

    const startIn = new Date(inTime);
    startIn.setMinutes(startIn.getMinutes() - shift.gt_before_in);
    console.log("startIn : ", startIn)

    const endIn = new Date(inTime);
    endIn.setMinutes(endIn.getMinutes() + shift.gt_after_in);
    console.log("endIn : ", endIn)

    const startOut = new Date(outTime);
    startOut.setMinutes(startOut.getMinutes() - shift.gt_before_out);
    console.log("startOut : ", startOut)

    const endOut = new Date(outTime);
    endOut.setMinutes(endOut.getMinutes() + shift.gt_after_out);
    console.log("endOut : ", endOut)

    const startOfMonth = new Date(now);
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);

    const [total_in, late_in, leave, overtime, officialTravel] = await Promise.all([
      Attendance.count({
        where: {
          subcont: userNrp,
          in_time: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      }),
      Attendance.count({
        where: {
          subcont: userNrp,
          is_late: 1,
          in_time: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      }),
      TrxLeave.count({
        where: {
          user: userNrp,
          created_at: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      }),
      TrxOvertime.count({
        where: {
          user: userNrp,
          created_at: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      }),
      TrxOfficialTravel.count({
        where: {
          user: userNrp,
          created_at: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      }),
    ]);

    const startOfDay = new Date(shiftDay);
    startOfDay.setUTCHours(0, 0, 0, 0);
    console.log("startOfDay : ", startOfDay)

    const endOfDay = new Date(shiftDay);
    endOfDay.setUTCHours(23, 59, 59, 999);
    console.log("endOfDay : ", endOfDay)

    const existingAttendance = await Attendance.findFirst({
      where: {
        subcont: userNrp,
        in_time: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const hasCheckedIn = !!existingAttendance?.in_time;
    console.log(now >= startOut && now <= endOut)
    res.status(200).json({
      success: true,
      data: {
        id_shift: shiftDetail.id_shift,
        shift_name: shift.name,
        in_time_shift: shift.in_time?.toISOString().slice(11, 16) ?? null,
        out_time_shift: shift.out_time?.toISOString().slice(11, 16) ?? null,
        gt_before_in: startIn,
        gt_after_in: endIn,
        gt_before_out: startOut,
        gt_after_out: endOut,
        worklocation_lat_long: user?.worklocation_lat_long,
        lat_long_distance: user?.latlon_distance,
        total_data_in: total_in,
        total_data_late_in: late_in,
        total_data_leave: leave,
        total_data_overtime: overtime,
        total_data_official_travel: officialTravel,
        clock_in_today: existingAttendance?.in_time ?? "",
        clock_out_today: existingAttendance?.out_time ?? "",
        canCheckIn: now >= startIn && now <= endIn && !hasCheckedIn,
        canCheckOut: now >= startOut && now <= endOut,
        usedYesterdayShift,
      },
    });
  } catch (error) {
    console.error("Error in getAttendanceToday:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const checkInAttendance = async (req: Request & { user?: { nrp: string }; file?: Express.Multer.File }, res: Response): Promise<void> => {
  try {
    const { userIP, longitude, latitude, inTime, startIn, endIn, shiftId } = req.body;
    const userNrp = req.user?.nrp;
    const formattedIP = userIP ? `::ffff:${userIP}` : "";

    if (!longitude || !latitude || !inTime || !startIn || !endIn || !shiftId) {
      res.status(400).json({ success: false, message: "Cannot be empty" });
      return;
    }
    console.log(`lat,long : ${latitude},${longitude}`)

    const checkTime = getCurrentWIBDate();

    if (checkTime < startIn || checkTime > endIn) {
      res.status(403).json({ success: false, message: "Check-in outside permitted hours" });
      return;
    }

    const user = await User.findFirst({
      where: { personal_number: userNrp },
      select: {
        worklocation_lat_long: true,
        latlon_distance: true,
      },
    });

    if (!user?.worklocation_lat_long || !user?.latlon_distance) {
      res.status(403).json({ success: false, message: "Work-location not set" });
      return;
    }

    const [refLat, refLon] = user.worklocation_lat_long
      .split(",")
      .map(Number);

    const distance = getDistanceMeters(
      Number(latitude),
      Number(longitude),
      refLat,
      refLon
    );
    console.log("distance REAL : ", distance)
    console.log("distance yang diizinkan : ", user.latlon_distance)

    // if (distance > user.latlon_distance) {
    //   res.status(403).json({
    //     success: false,
    //     message: `You are outside the allowed radius (${Math.round(distance)} m > ${user.latlon_distance} m)`,
    //   });
    //   return;
    // }

    const fotoFilename = req.file?.filename;
    if (!fotoFilename) {
      res.status(400).json({ success: false, message: "Photo is required" });
      return;
    }

    const isLate = checkTime > inTime ? 1 : 0;

    const checkedIn = await Attendance.create({
      data: {
        subcont: userNrp,
        shift_code: shiftId,
        remote_addr_in: formattedIP,
        in_time: checkTime,
        latitude_in: latitude,
        longitude_in: longitude,
        foto_in: fotoFilename,
        work_metode: "WFO",
        client: "PT United Tractors Pandu Engineering",
        is_ovt: 0,
        is_happy: 1,
        is_late: isLate,
        checked_by: userNrp,
        checked_at: getCurrentWIBDate(),
        created_at: getCurrentWIBDate(),
        updated_at: getCurrentWIBDate(),
      },
    });

    res.status(200).send(
      JSONbig.stringify({
        success: true,
        message: "Check-in was successful",
        data: checkedIn
      })
    );
  } catch (error) {
    console.error("Error checkInAttendance:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const checkOutAttendance = async (
  req: Request & { user?: { nrp: string }; file?: Express.Multer.File },
  res: Response
): Promise<void> => {
  try {
    const { userIP, longitude, latitude, endIn, startOut, endOut, shiftId } = req.body;
    const userNrp = req.user?.nrp;
    const formattedIP = userIP ? `::ffff:${userIP}` : "";

    if (!longitude || !latitude || !endIn || !startOut || !endOut || !shiftId) {
      res.status(400).json({ success: false, message: "Cannot be empty" });
      return;
    }

    const checkTime = getCurrentWIBDate();
    if (checkTime < startOut || checkTime > endOut) {
      res
        .status(403)
        .json({ success: false, message: "Check-out outside permitted hours" });
      return;
    }

    const user = await User.findFirst({
      where: { personal_number: userNrp },
      select: { worklocation_lat_long: true, latlon_distance: true },
    });
    if (!user?.worklocation_lat_long || !user?.latlon_distance) {
      res.status(403).json({ success: false, message: "Work-location not set" });
      return;
    }

    const [refLat, refLon] = user.worklocation_lat_long.split(",").map(Number);
    const distance = getDistanceMeters(+latitude, +longitude, refLat, refLon);
    // if (distance > user.latlon_distance) {
    //   res.status(403).json({
    //     success: false,
    //     message: `You are outside the allowed radius (${Math.round(
    //       distance
    //     )} m > ${user.latlon_distance} m)`,
    //   });
    //   return;
    // }

    const shift = await Shift.findUnique({
      where: { code: shiftId },
      select: { flag_shift: true },
    });
    if (!shift) {
      res.status(404).json({ success: false, message: "Shift not found" });
      return;
    }
    const flagShift = shift.flag_shift; // 0 = normal-day, 1 = cross-day

    const startToday = new Date(checkTime);
    startToday.setUTCHours(0, 0, 0, 0);

    let searchStart = startToday;

    if (flagShift === 1) {
      const startYesterday = new Date(startToday);
      startYesterday.setDate(startYesterday.getDate() - 1);
      searchStart = startYesterday;
    }

    const fotoFilename = req.file?.filename;
    if (!fotoFilename) {
      res.status(400).json({ success: false, message: "Photo is required" });
      return;
    }

    const attendance = await Attendance.findFirst({
      where: {
        subcont: userNrp,
        //shift_code: shiftId,
        in_time: {
          gte: searchStart,
          lte: checkTime,
        },
      },
    });

    if (attendance) {
      await Attendance.update({
        where: { id: attendance.id },
        data: {
          remote_addr_out: formattedIP,
          out_time: checkTime,
          latitude_out: latitude,
          longitude_out: longitude,
          foto_out: fotoFilename,
          updated_at: getCurrentWIBDate(),
        },
      });
    } else {
      await Attendance.create({
        data: {
          subcont: userNrp,
          shift_code: shiftId,
          remote_addr_in: formattedIP,
          in_time: endIn,
          latitude_in: latitude,
          longitude_in: longitude,
          foto_in: fotoFilename,
          remote_addr_out: formattedIP,
          out_time: checkTime,
          latitude_out: latitude,
          longitude_out: longitude,
          foto_out: fotoFilename,
          client: "PT United Tractors Pandu Engineering",
          work_metode: "WFO",
          is_late: 1,
          is_ovt: 0,
          is_happy: 1,
          checked_by: userNrp,
          checked_at: getCurrentWIBDate(),
          created_at: getCurrentWIBDate(),
          updated_at: getCurrentWIBDate(),
        },
      });
    }

    res
      .status(200)
      .json({ success: true, message: "Check-out was successful" });
  } catch (err) {
    console.error("Error checkOutAttendance:", err);
    res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};