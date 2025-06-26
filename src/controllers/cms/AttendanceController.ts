import { Request, Response } from "express";
import { Attendance } from "../../models/Table/Satria/TrxAttendance";
import { TrxShiftEmployee } from "../../models/Table/Satria/TrxShiftEmployee";
import { getCurrentWIBDate } from "../../helpers/timeHelper";
import { calculateDistance } from "../../helpers/geofences";
import JSONbig from "json-bigint";
import { Shift } from "../../models/Table/Satria/MsShift";
import { TrxLeave } from "../../models/Table/Satria/TrxLeave";
import { TrxOvertime } from "../../models/Table/Satria/TrxOvertime";
import { TrxOfficialTravel } from "../../models/Table/Satria/TrxOfficialTravel";
import { User } from "../../models/Table/Satria/MsUser";
import ExcelJS from "exceljs";
import * as fs from 'fs';

export const getMonthlyAttendanceSummary = async (
  req: Request & { user?: { nrp: string } },
  res: Response
): Promise<void> => {
  try {
    const userNrp = req.user?.nrp;
    const isAdmin = userNrp === "P0120001";

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const startDate = new Date(currentYear, currentMonth, 1);
    const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

    // Date range untuk perhitungan tahunan
    const yearStartDate = new Date(currentYear, 0, 1);
    const yearEndDate = new Date(currentYear, 11, 31, 23, 59, 59, 999);

    const subordinateUsers = !isAdmin
      ? await User.findMany({
        where: { superior: userNrp },
        select: { personal_number: true },
      })
      : [];

    const allowedNrps = isAdmin
      ? undefined
      : [userNrp!, ...subordinateUsers.map((u) => u.personal_number)];

    const buildWhereClause = (start: Date, end: Date) => {
      const whereClause: any = {
        in_time: { gte: start, lte: end },
      };
      if (allowedNrps) whereClause.subcont = { in: allowedNrps };
      return whereClause;
    };

    const userWhereClause: any = {
      role_id: "10",
      is_active: 0,
    };
    if (allowedNrps) userWhereClause.personal_number = { in: allowedNrps };

    const totalEmployees = await User.count({ where: userWhereClause });

    const yearlyWorkingDays = (() => {
      let count = 0;
      for (let month = 0; month < 12; month++) {
        const monthEnd = new Date(currentYear, month + 1, 0);
        const totalDaysInMonth = monthEnd.getDate();

        for (let d = 1; d <= totalDaysInMonth; d++) {
          const date = new Date(currentYear, month, d);
          const day = date.getDay();
          if (day >= 1 && day <= 5) count++;
        }
      }
      return count;
    })();

    const yearlyExpected = totalEmployees * yearlyWorkingDays;

    const yearlyData = await Attendance.findMany({
      where: buildWhereClause(yearStartDate, yearEndDate),
    });

    const yearlyTotalAttendance = yearlyData.length;
    const yearlyOnTimeAttendance = yearlyData.filter((a) => a.is_late === 0 && a.is_early_out === 0).length;
    const yearlyLateAttendance = yearlyData.filter((a) => a.is_late === 1 && a.is_early_out === 0).length;
    const yearlyEarlyOutAttendance = yearlyData.filter((a) => a.is_late === 0 && a.is_early_out === 1).length;
    const yearlyLateAndEarlyOutAttendance = yearlyData.filter((a) => a.is_late === 1 && a.is_early_out === 1).length;
    const yearlyAbsent = yearlyExpected - yearlyTotalAttendance;

    const yearlyOnTimePercentage = yearlyExpected > 0 ? Math.round((yearlyOnTimeAttendance / yearlyExpected) * 100) : 0;
    const yearlyLatePercentage = yearlyExpected > 0 ? Math.round((yearlyLateAttendance / yearlyExpected) * 100) : 0;
    const yearlyEarlyOutPercentage = yearlyExpected > 0 ? Math.round((yearlyEarlyOutAttendance / yearlyExpected) * 100) : 0;
    const yearlyLateAndEarlyOutPercentage = yearlyExpected > 0 ? Math.round((yearlyLateAndEarlyOutAttendance / yearlyExpected) * 100) : 0;
    const yearlyAbsentPercentage = yearlyExpected > 0 ? Math.round((yearlyAbsent / yearlyExpected) * 100) : 0;

    const workingDays = (() => {
      const totalDays = endDate.getDate();
      let count = 0;
      for (let d = 1; d <= totalDays; d++) {
        const date = new Date(currentYear, currentMonth, d);
        const day = date.getDay();
        if (day >= 1 && day <= 5) count++;
      }
      return count;
    })();

    const expected = totalEmployees * workingDays;

    const thisMonthData = await Attendance.findMany({
      where: buildWhereClause(startDate, endDate),
    });

    const summary = {
      statsData: {
        onTime: {
          title: `${yearlyOnTimeAttendance}/${yearlyExpected}`,
          subtitle: `On Time ${yearlyOnTimePercentage}%`,
          percentage: "0.4%",
          count: yearlyOnTimeAttendance,
          total: yearlyExpected,
          percentage_value: yearlyOnTimePercentage
        },
        late: {
          title: `${yearlyLateAttendance}/${yearlyExpected}`,
          subtitle: `Late In ${yearlyLatePercentage}%`,
          percentage: "0%",
          count: yearlyLateAttendance,
          total: yearlyExpected,
          percentage_value: yearlyLatePercentage
        },
        earlyOut: {
          title: `${yearlyEarlyOutAttendance}/${yearlyExpected}`,
          subtitle: `Early Out ${yearlyEarlyOutPercentage}%`,
          percentage: "-2.78%",
          count: yearlyEarlyOutAttendance,
          total: yearlyExpected,
          percentage_value: yearlyEarlyOutPercentage
        },
        lateAndEarly: {
          title: `${yearlyLateAndEarlyOutAttendance}/${yearlyExpected}`,
          subtitle: `Late & Early ${yearlyLateAndEarlyOutPercentage}%`,
          percentage: "-2.78%",
          count: yearlyLateAndEarlyOutAttendance,
          total: yearlyExpected,
          percentage_value: yearlyLateAndEarlyOutPercentage
        },
        absent: {
          title: `${yearlyAbsent}/${yearlyExpected}`,
          subtitle: `Absence ${yearlyAbsentPercentage}%`,
          percentage: "100%",
          count: yearlyAbsent,
          total: yearlyExpected,
          percentage_value: yearlyAbsentPercentage
        }
      },
      total_employees: totalEmployees,
      working_days: workingDays,
      expected_attendance: expected,
      actual_attendance: thisMonthData.length,
      attendance_rate: expected > 0 ? Math.round((thisMonthData.length / expected) * 100) : 0,
    };

    const trend: any[] = [];
    for (let month = 0; month < 12; month++) {
      const mStart = new Date(currentYear, month, 1);
      const mEnd = new Date(currentYear, month + 1, 0, 23, 59, 59, 999);

      const data = await Attendance.findMany({
        where: buildWhereClause(mStart, mEnd),
      });

      const mTotalDays = mEnd.getDate();
      let mWorkingDays = 0;
      for (let d = 1; d <= mTotalDays; d++) {
        const date = new Date(currentYear, month, d);
        const day = date.getDay();
        if (day >= 1 && day <= 5) mWorkingDays++;
      }

      const mExpected = totalEmployees * mWorkingDays;

      trend.push({
        month: new Date(currentYear, month).toLocaleString("default", { month: "short" }),
        onTime: data.filter((a) => a.is_late === 0 && a.is_early_out === 0).length,
        late: data.filter((a) => a.is_late === 1 && a.is_early_out === 0).length,
        earlyOut: data.filter((a) => a.is_late === 0 && a.is_early_out === 1).length,
        lateAndEarly: data.filter((a) => a.is_late === 1 && a.is_early_out === 1).length,
        absent: mExpected - data.length,
        expected: mExpected,
      });
    }

    res.status(200).json({
      success: true,
      message: "Full attendance overview",
      data: {
        data: {
          summary,
          chart: trend,
        }
      },
    });
  } catch (err) {
    console.error("Full overview error:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
};

export const getAllDailyAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = "1",
      limit = "5",
      search = "",
      sort = "in_time",
      order = "desc",
      startDate: queryStartDate,
      endDate: queryEndDate,
      month: queryMonth,
      detail = "false",
      user_id,
      export: exportExcel = "",
    } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const pageSize = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * pageSize;

    let parsedStartDate: Date | undefined;
    let parsedEndDate: Date | undefined;

    if (queryStartDate) {
      parsedStartDate = new Date(`${queryStartDate as string}T00:00:00.000Z`);
      if (isNaN(parsedStartDate.getTime())) {
        res.status(400).json({ success: false, message: "Invalid startDate format. Use YYYY-MM-DD." });
        return;
      }
    }
    if (queryEndDate) {
      parsedEndDate = new Date(`${queryEndDate as string}T23:59:59.999Z`);
      if (isNaN(parsedEndDate.getTime())) {
        res.status(400).json({ success: false, message: "Invalid endDate format. Use YYYY-MM-DD." });
        return;
      }
    }

    if (!parsedStartDate && !parsedEndDate && exportExcel === "") {
      const today = new Date();
      parsedStartDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
      parsedEndDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    }

    if (parsedStartDate && !parsedEndDate && exportExcel === "") {
      parsedEndDate = new Date(parsedStartDate.getFullYear(), parsedStartDate.getMonth(), parsedStartDate.getDate(), 23, 59, 59, 999);
    }

    const whereCondition = {
      ...(parsedStartDate && parsedEndDate && {
        in_time: {
          gte: parsedStartDate,
          lte: parsedEndDate,
        },
      }),
      ...(search && {
        OR: [
          {
            MsUser: {
              name: {
                contains: search as string,
              },
            }
          },
          {
            MsUser: {
              personal_number: {
                contains: search as string,
              },
            }
          },
          {
            MsShift: {
              name: {
                contains: search as string,
              }
            }
          }
        ]
      })
    };

    const attendanceData = await Attendance.findMany({
      where: whereCondition,
      include: {
        MsUser: {
          select: {
            id: true,
            photo: true,
            name: true,
            personal_number: true,
            division: true,
            department: true,
            company_name: true
          }
        },
        MsShift: true,
      },
      orderBy: {
        in_time: "desc"
      },
      skip,
      take: pageSize,
    });

    // HANDLE DETAIL REQUEST
    if (detail === "true" && user_id) {
      try {
        const userDetailData = await User.findFirst({
          where: {
            personal_number: String(user_id)
          },
          include: {
            user_detail: {
              include: {
                MsMarital: {
                  select: {
                    code: true,
                    ket: true
                  }
                },
                MsKlasifikasi: {
                  select: {
                    name: true
                  }
                },
                MsVendor: {
                  select: {
                    name: true
                  }
                }
              }
            }
          },
        });

        const attendanceHistoryCondition: any = {
          subcont: String(user_id),
        };

        if (queryMonth) {
          const inputDate = new Date(String(queryMonth));
          const startOfMonth = new Date(inputDate.getFullYear(), inputDate.getMonth(), 1);
          const endOfMonth = new Date(inputDate.getFullYear(), inputDate.getMonth() + 1, 0, 23, 59, 59, 999);

          attendanceHistoryCondition.in_time = {
            gte: startOfMonth,
            lte: endOfMonth,
          };
        }

        const attendanceUserData = await Attendance.findMany({
          where: attendanceHistoryCondition,
          include: {
            MsUser: {
              select: {
                id: true,
                photo: true,
                name: true,
                personal_number: true,
                division: true,
                department: true,
                company_name: true,
                email: true
              }
            },
            MsShift: true
          },
          orderBy: {
            in_time: "desc"
          },
        });

        const totalAttendanceItems = await Attendance.count({
          where: attendanceHistoryCondition,
        });

        res.status(200).send(
          JSONbig.stringify({
            success: true,
            data: {
              data: {
                userData: userDetailData,
                attendanceHistory: attendanceUserData,
              },
              totalItems: totalAttendanceItems,
              currentPage: pageNumber,
              totalPages: Math.ceil(totalAttendanceItems / pageSize),
            },
          })
        );
        return;
      } catch (detailError) {
        console.error("Error getting user detail:", detailError);
        res.status(404).json({
          success: false,
          message: "User not found or error retrieving user details",
        });
        return;
      }
    }

    // --- HANDLE EXPORT REQUEST (MONTHLY) ---
    if (exportExcel === "monthly") {
      try {
        let exportStartDate: Date;
        let exportEndDate: Date;
        let selectedYear: number;
        let selectedMonth: number;

        if (queryStartDate && queryEndDate) {
          exportStartDate = parsedStartDate!;
          exportEndDate = parsedEndDate!;
          selectedYear = exportStartDate.getFullYear();
          selectedMonth = exportStartDate.getMonth();
        } else if (queryMonth) {
          const [yearStr, monthStr] = (queryMonth as string).split('-');
          const year = parseInt(yearStr, 10);
          const month = parseInt(monthStr, 10) - 1;

          if (isNaN(year) || isNaN(month) || month < 0 || month > 11) {
            res.status(400).json({ success: false, message: "Invalid month format for monthly export. Use YYYY-MM." });
            return;
          }
          exportStartDate = new Date(year, month, 1, 0, 0, 0, 0);
          exportEndDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
          selectedYear = year;
          selectedMonth = month;
        } else {
          const now = new Date();
          selectedYear = now.getFullYear();
          selectedMonth = now.getMonth();
          exportStartDate = new Date(selectedYear, selectedMonth, 1, 0, 0, 0, 0);
          exportEndDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999);
        }

        const totalDaysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Attendance Report Monthly');

        try {
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
        } catch (error) {
          console.warn("Failed to load logo.png, proceeding without logo:", error);
        }

        const excelWhereCondition: any = {
          in_time: {
            gte: exportStartDate,
            lte: exportEndDate,
          },
        };
        if (user_id) {
          excelWhereCondition.MsUser = { personal_number: String(user_id) };
        }

        const attendanceDataForExcel = await Attendance.findMany({
          where: excelWhereCondition,
          include: {
            MsUser: {
              select: {
                id: true,
                photo: true,
                name: true,
                personal_number: true,
                division: true,
                department: true,
                company_name: true
              }
            }
          },
          orderBy: {
            in_time: "asc"
          },
        });

        // Group attendance records by user
        const userAttendanceMap = new Map();
        attendanceDataForExcel.forEach(record => {
          const userKey = record.MsUser?.personal_number || 'UNKNOWN_NRP';
          if (!userAttendanceMap.has(userKey)) {
            userAttendanceMap.set(userKey, {
              userData: record.MsUser,
              attendanceRecords: []
            });
          }
          userAttendanceMap.get(userKey).attendanceRecords.push(record);
        });

        if (userAttendanceMap.size === 0) {
          res.status(204).send();
          return;
        }

        const getMonthName = (monthIndex: number): string => {
          const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
          return months[monthIndex];
        };

        const getDayStatus = (date: Date): string => {
          const dayOfWeek = date.getDay();
          return (dayOfWeek === 0 || dayOfWeek === 6) ? 'H' : 'W';
        };

        let isFirstUserInSheet = true;

        for (const [userNrp, userInfo] of userAttendanceMap) {
          const { userData, attendanceRecords } = userInfo;

          if (!isFirstUserInSheet) {
            worksheet.addRow([]);
            worksheet.addRow([]);
          } else {
            while (worksheet.lastRow && worksheet.lastRow.number < 3) {
              worksheet.addRow([]);
            }
            if (!worksheet.lastRow || worksheet.lastRow.number < 3) {
              let currentLastRow = worksheet.lastRow ? worksheet.lastRow.number : 0;
              while (currentLastRow < 3) {
                worksheet.addRow([]);
                currentLastRow++;
              }
            }
          }

          let titleRow = worksheet.addRow(['Attendance Report']);
          worksheet.mergeCells(`A${titleRow.number}:H${titleRow.number}`);
          titleRow.getCell('A').font = { size: 16, bold: true };
          titleRow.getCell('A').alignment = { horizontal: 'center' };

          let empRow1 = worksheet.addRow(['NRP .', userData?.personal_number || '-', '', 'Name .', userData?.name || '-']);
          let empRow2 = worksheet.addRow(['DEPT .', userData?.department || '-', '']);
          let empRow3 = worksheet.addRow(['Perusahaan .', userData?.company_name || '-']);
          let empRow4 = worksheet.addRow(['PERIODE .', `${getMonthName(selectedMonth)} ${selectedYear}`]);

          [empRow1, empRow2, empRow3, empRow4].forEach(row => {
            row.getCell('A').font = { bold: true };
            row.getCell('D').font = { bold: true };
          });

          worksheet.addRow([]);

          const attendanceMap = new Map();
          let totalLateIn = 0;
          let totalPresence = 0;

          attendanceRecords.forEach((record: any) => {
            if (record.in_time) {
              const recordDate = new Date(record.in_time);
              const dateKey = recordDate.getUTCDate();
              attendanceMap.set(dateKey, record);
              totalPresence++;
              if (record.is_late) {
                totalLateIn++;
              }
            }
          });

          const overtimeData = await TrxOvertime.findMany({
            where: {
              user: userNrp,
              status_id: 3,
              check_in_ovt: {
                gte: exportStartDate,
                lte: exportEndDate,
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

          const [totalLeave, totalOfficialTravel] = await Promise.all([
            TrxLeave.count({
              where: {
                user: userNrp,
                status_id: 3,
                start_date: {
                  gte: exportStartDate,
                  lte: exportEndDate,
                }
              }
            }),
            TrxOfficialTravel.count({
              where: {
                user: userNrp,
                start_date: {
                  gte: exportStartDate,
                  lte: exportEndDate,
                }
              }
            }),
          ]);

          let summaryHeaderRow = worksheet.addRow([]);
          summaryHeaderRow.getCell('A').value = 'PRESENCE';
          worksheet.mergeCells(`A${summaryHeaderRow.number}:B${summaryHeaderRow.number}`);
          summaryHeaderRow.getCell('C').value = 'LATE IN';
          worksheet.mergeCells(`C${summaryHeaderRow.number}:D${summaryHeaderRow.number}`);
          summaryHeaderRow.getCell('E').value = 'LEAVE';
          worksheet.mergeCells(`E${summaryHeaderRow.number}:F${summaryHeaderRow.number}`);
          summaryHeaderRow.getCell('G').value = 'OFFICIAL TRAVEL';
          worksheet.mergeCells(`G${summaryHeaderRow.number}:H${summaryHeaderRow.number}`);

          let summaryValueRow = worksheet.addRow([]);
          summaryValueRow.getCell('A').value = totalPresence;
          worksheet.mergeCells(`A${summaryValueRow.number}:B${summaryValueRow.number}`);
          summaryValueRow.getCell('C').value = totalLateIn;
          worksheet.mergeCells(`C${summaryValueRow.number}:D${summaryValueRow.number}`);
          summaryValueRow.getCell('E').value = totalLeave;
          worksheet.mergeCells(`E${summaryValueRow.number}:F${summaryValueRow.number}`);
          summaryValueRow.getCell('G').value = totalOfficialTravel;
          worksheet.mergeCells(`G${summaryValueRow.number}:H${summaryValueRow.number}`);

          [summaryHeaderRow, summaryValueRow].forEach(row => {
            for (let col = 1; col <= 8; col++) {
              row.getCell(col).alignment = { horizontal: 'center', vertical: 'middle' };
              row.getCell(col).border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
              };
            }
          });

          worksheet.addRow([]);
          let tableHeaderRow1 = worksheet.addRow([]);
          tableHeaderRow1.getCell('A').value = 'Date';
          tableHeaderRow1.getCell('B').value = 'ATTENDANCE';
          tableHeaderRow1.getCell('D').value = 'OVERTIME';
          tableHeaderRow1.getCell('F').value = 'NOTES';

          let tableHeaderRow2 = worksheet.addRow([]);
          tableHeaderRow2.getCell('B').value = 'In';
          tableHeaderRow2.getCell('C').value = 'Out';
          tableHeaderRow2.getCell('D').value = 'In';
          tableHeaderRow2.getCell('E').value = 'Out';

          worksheet.mergeCells(`A${tableHeaderRow1.number}:A${tableHeaderRow2.number}`);
          worksheet.mergeCells(`B${tableHeaderRow1.number}:C${tableHeaderRow1.number}`);
          worksheet.mergeCells(`D${tableHeaderRow1.number}:E${tableHeaderRow1.number}`);
          worksheet.mergeCells(`F${tableHeaderRow1.number}:H${tableHeaderRow2.number}`);

          [tableHeaderRow1, tableHeaderRow2].forEach(row => {
            for (let col = 1; col <= 8; col++) {
              const cell = row.getCell(col);
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
              cell.font = { bold: true };
              cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
              };
            }
          });

          const dataStartRow = tableHeaderRow2.number + 1;
          let lastDataRow = dataStartRow;

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
            const notes = attendanceRecord?.note || "";

            const overtimeIn = overtimeRecord?.check_in_ovt
              ? new Date(overtimeRecord.check_in_ovt).toISOString().slice(11, 16)
              : "-";
            const overtimeOut = overtimeRecord?.check_out_ovt
              ? new Date(overtimeRecord.check_out_ovt).toISOString().slice(11, 16)
              : "-";

            const row = worksheet.addRow([day, inTime, outTime, overtimeIn, overtimeOut, notes]);
            worksheet.mergeCells(`F${row.number}:H${row.number}`);
            row.getCell('F').value = notes;
            lastDataRow = row.number;

            if (attendanceRecord?.is_late === 1) {
              row.getCell(2).font = { color: { argb: 'FFFF0000' } };
            }

            const dayStatus = getDayStatus(currentDate);
            if (dayStatus === 'H') {
              row.eachCell((cell) => {
                cell.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FFD3D3D3' },
                };
              });
            }

            for (let col = 1; col <= 8; col++) {
              const cell = row.getCell(col);
              cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
              };
              if (col < 6) {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
              }
            }
          }

          isFirstUserInSheet = false;
        }

        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename=Monthly_Attendance_Report_${queryMonth || `${getMonthName(selectedMonth)}_${selectedYear}`}.xlsx`);
        res.send(buffer);
        return;
      } catch (error) {
        console.error('Error generating monthly Excel report:', error);
        res.status(500).json({
          success: false,
          message: "Failed to generate monthly Excel report.",
        });
        return;
      }
    } else if (exportExcel === "daily") {
      // --- HANDLE EXPORT REQUEST (DAILY) ---
      try {
        if (!queryStartDate) {
          res.status(400).json({
            success: false,
            message: "Parameter 'startDate' is required for daily export."
          });
          return;
        }

        const exportInputDate = new Date(queryStartDate as string);
        if (isNaN(exportInputDate.getTime())) {
          res.status(400).json({ success: false, message: "Invalid startDate format for daily export. Use YYYY-MM-DD." });
          return;
        }

        const exportSelectedYear = exportInputDate.getFullYear();
        const exportSelectedMonth = exportInputDate.getMonth();
        const exportSelectedDay = exportInputDate.getDate();
        const exportStartDate = new Date(exportSelectedYear, exportSelectedMonth, exportSelectedDay, 0, 0, 0, 0);
        const exportEndDate = new Date(exportSelectedYear, exportSelectedMonth, exportSelectedDay, 23, 59, 59, 999);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Daily Attendance Report');

        try {
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
        } catch (error) {
          console.warn("Failed to load logo.png, proceeding without logo:", error);
        }

        const excelWhereCondition: any = {
          in_time: {
            gte: exportStartDate,
            lte: exportEndDate,
          },
        };

        if (user_id) {
          excelWhereCondition.MsUser = { personal_number: String(user_id) };
        }

        const attendanceDataForExcel = await Attendance.findMany({
          where: excelWhereCondition,
          include: {
            MsUser: {
              select: {
                id: true,
                name: true,
                personal_number: true,
                division: true,
                department: true,
              }
            }
          },
          orderBy: {
            in_time: "asc"
          },
        });

        if (!attendanceDataForExcel || attendanceDataForExcel.length === 0) {
          res.status(204).send();
          return;
        }

        while (worksheet.lastRow && worksheet.lastRow.number < 3) {
          worksheet.addRow([]);
        }
        if (!worksheet.lastRow || worksheet.lastRow.number < 3) {
          let currentLastRow = worksheet.lastRow ? worksheet.lastRow.number : 0;
          while (currentLastRow < 3) {
            worksheet.addRow([]);
            currentLastRow++;
          }
        }

        // Title
        let titleRow = worksheet.addRow(['Daily Attendance Report']);
        worksheet.mergeCells(`A${titleRow.number}:E${titleRow.number}`);
        titleRow.getCell('A').font = { size: 16, bold: true };
        titleRow.getCell('A').alignment = { horizontal: 'center' };

        let periodRow = worksheet.addRow(['Date .', exportInputDate.toLocaleDateString('id-ID')]);
        periodRow.getCell('A').font = { bold: true };
        worksheet.addRow([]);

        // Table Headers
        let headerRow = worksheet.addRow(['NRP', 'Name', 'Department', 'In Time', 'Out Time']);
        headerRow.eachCell((cell) => {
          cell.font = { bold: true };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });

        const dataStartRow = headerRow.number + 1;
        let lastDataRow = dataStartRow - 1;

        // Add data rows
        attendanceDataForExcel.forEach(record => {
          const inTime = record.in_time ? new Date(record.in_time).toISOString().slice(11, 16) : "-";
          const outTime = record.out_time ? new Date(record.out_time).toISOString().slice(11, 16) : "-";

          const row = worksheet.addRow([
            record.MsUser?.personal_number || '-',
            record.MsUser?.name || '-',
            record.MsUser?.department || '-',
            inTime,
            outTime
          ]);
          lastDataRow = row.number;

          if (record.is_late === 1) {
            row.getCell(4).font = { color: { argb: 'FFFF0000' } };
          }

          for (let col = 1; col <= 5; col++) {
            const cell = row.getCell(col);
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          }
        });

        worksheet.columns.forEach((column, index) => {
          if (index === 0) column.width = 15; // NRP
          else if (index === 1) column.width = 25; // Name
          else if (index === 2) column.width = 20; // Department
          else if (index === 3 || index === 4) column.width = 15; // In Time, Out Time
        });

        const buffer = await workbook.xlsx.writeBuffer();

        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename=Daily_Attendance_Report_${queryStartDate}.xlsx`);
        res.send(buffer);
        return;
      } catch (error) {
        console.error('Error generating daily Excel report:', error);
        res.status(500).json({
          success: false,
          message: "Failed to generate daily Excel report.",
        });
        return;
      }
    }

    // --- DEFAULT RESPONSE (NON-EXPORT, NON-DETAIL) ---
    const totalItems = await Attendance.count({
      where: whereCondition,
    });

    res.status(200).send(
      JSONbig.stringify({
        success: true,
        data: {
          data: attendanceData,
          totalItems,
          currentPage: pageNumber,
          totalPages: Math.ceil(totalItems / pageSize),
        },
      })
    );

  } catch (err) {
    console.error("Error in getAllDailyAttendance:", err);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve attendance data.",
    });
  }
};

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
    const today = new Date(now);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const todayDayName = daysOfWeek[today.getUTCDay()];
    const yesterdayDayName = daysOfWeek[yesterday.getUTCDay()];

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
    const inTime = setTimeToDay(new Date(shift.in_time!), shiftDay);
    const outTime = setTimeToDay(new Date(shift.out_time!), shiftDay, shift.flag_shift === 1 ? 1 : 0);

    const startIn = new Date(inTime);
    startIn.setMinutes(startIn.getMinutes() - shift.gt_before_in);

    const endIn = new Date(inTime);
    endIn.setMinutes(endIn.getMinutes() + shift.gt_after_in);

    const startOut = new Date(outTime);
    startOut.setMinutes(startOut.getMinutes() - shift.gt_before_out);

    const endOut = new Date(outTime);
    endOut.setMinutes(endOut.getMinutes() + shift.gt_after_out);

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

    const endOfDay = new Date(shiftDay);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const existingAttendance = await Attendance.findFirst({
      where: {
        subcont: userNrp,
        in_time: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

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

    const { distance } = await calculateDistance(
      Number(latitude),
      Number(longitude),
      refLat,
      refLon
    );

    if (distance > user.latlon_distance) {
      res.status(403).json({
        success: false,
        message: `You are outside the allowed radius (${Math.round(distance)} m > ${user.latlon_distance} m)`,
      });
      return;
    }

    const fotoFilename = req.file?.filename;
    if (!fotoFilename) {
      res.status(400).json({ success: false, message: "Photo is required" });
      return;
    }

    const [inTimeHours, inTimeMinutes] = inTime.split(':').map(Number);
    const checkTimeTotalMinutes = checkTime.getUTCHours() * 60 + checkTime.getUTCMinutes();
    const inTimeTargetTotalMinutes = inTimeHours * 60 + inTimeMinutes;

    const isLate = checkTimeTotalMinutes > inTimeTargetTotalMinutes ? 1 : 0;

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
    const { userIP, longitude, latitude, endIn, outTime, startOut, endOut, shiftId } = req.body;
    const userNrp = req.user?.nrp;
    const formattedIP = userIP ? `::ffff:${userIP}` : "";

    if (!longitude || !latitude || !endIn || !outTime || !startOut || !endOut || !shiftId) {
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

    const [refLat, refLon] = user.worklocation_lat_long
      .split(",")
      .map(Number);

    const { distance } = await calculateDistance(
      Number(latitude),
      Number(longitude),
      refLat,
      refLon
    );

    // if (distance > user.latlon_distance) {
    //   res.status(403).json({
    //     success: false,
    //     message: `You are outside the allowed radius (${Math.round(distance)} m > ${user.latlon_distance} m)`,
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

    const [outTimeHours, outTimeMinutes] = outTime.split(':').map(Number);
    const checkTimeTotalMinutes = checkTime.getUTCHours() * 60 + checkTime.getUTCMinutes();
    const outTimeTargetTotalMinutes = outTimeHours * 60 + outTimeMinutes;

    const isEarlyOut = checkTimeTotalMinutes < outTimeTargetTotalMinutes ? 1 : 0;

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
          is_early_out: isEarlyOut,
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
          is_early_out: isEarlyOut,
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