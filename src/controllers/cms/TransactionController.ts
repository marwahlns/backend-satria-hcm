import JSONbig from "json-bigint";
import { Request, Response } from "express";
import { TrxLeave } from "../../models/Table/Satria/TrxLeave";
import { TrxOvertime } from "../../models/Table/Satria/TrxOvertime";
import { TrxOfficialTravel } from "../../models/Table/Satria/TrxOfficialTravel";
import { TrxMutation } from "../../models/Table/Satria/TrxMutation";
import { TrxResign } from "../../models/Table/Satria/TrxResign";
import { TrxLeaveQuota } from "../../models/Table/Satria/TrxLeaveQuota";
import { getCurrentWIBDate } from "../../helpers/timeHelper";
import { getStatusName, getModalType, generateExcelResponse } from "../../helpers/functionHelper";
import { User } from "../../models/Table/Satria/MsUser";
import { differenceInDays  } from "date-fns";
import ExcelJS from "exceljs";
import { TrxShiftEmployee } from "../../models/Table/Satria/TrxShiftEmployee";
import { ShiftGroup } from "../../models/Table/Satria/MsShiftGroup";
import { Shift } from "../../models/Table/Satria/MsShift";
import { Attendance } from "../../models/Table/Satria/TrxAttendance";


const trxModelMap: { [key: string]: any } = {
  leave: TrxLeave,
  overtime: TrxOvertime,
  officialTravel: TrxOfficialTravel,    
  mutation: TrxMutation,
  resign: TrxResign,
};


function formatDateTime(dateString: string | Date | null): string | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }) + " pukul " + date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

//coba
export const getAllTrxData = async (req: Request & { user?: { nrp: string } }, res: Response): Promise<void> => {
  try {
    const {
      type = "",
      page = "1",
      limit = "10",
      search = "",
      sort = "user",
      order = "asc",
      status = "0",
      month,
      year,
      exportData: exportQuery,
    } = req.query;

    const userNrp = req.user?.nrp;
    const pageNumber = parseInt(page as string, 10);
    const pageSize = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * pageSize;
    const sortOrder = order === "desc" ? "desc" : "asc";
    const parsedStatus = parseInt(status as string, 10);
    const statusFilter = parsedStatus > 0 ? { status_id: parsedStatus } : undefined;
    const startOfMonth = new Date(`${year}-${month}-01`);
    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    switch (type) {
      case "leave": {
        try {
          const isAdmin = userNrp === "P0120001";
          const validSortFields = ["name", "department", "title", "start_date", "end_date", "leave_reason", "total_leave_days"];
          const sortField = validSortFields.includes(sort as string) ? (sort as string) : "user";
        
          const dateFilter = month && year ? {
            OR: [
              { start_date: { gte: startOfMonth, lt: endOfMonth } },
              { end_date: { gte: startOfMonth, lt: endOfMonth } },
            ],
          } : undefined;
        
          const buildWhereClause = () => ({
            AND: [
              ...(!isAdmin
                ? [
                    {
                      OR: [
                        { accept_to: userNrp },
                        {
                          AND: [
                            { approve_to: userNrp },
                            { accepted_date: { not: null } },
                          ],
                        },
                        { user: userNrp },
                      ],
                    },
                  ]
                : []),
              {
                OR: [
                  { user_data: { name: { contains: search as string } } },
                  { user_data: { department: { contains: search as string } } },
                  { leave_type: { title: { contains: search as string } } },
                  { leave_reason: { contains: search as string } },
          
                  ...(Number(search) ? [
                    { total_leave_days: Number(search) },
                  ] : []),
                ],
              },
              ...(statusFilter ? [statusFilter] : []),
              ...(dateFilter ? [dateFilter] : []),
            ],
          });
        
          const getLeaveData = async () => {
            const TrxLeaveData = await TrxLeave.findMany({
              where: buildWhereClause(),
              include: {
                leave_type: { select: { title: true } },
                user_data: {
                  select: {
                    name: true,
                    dept_data: { select: { nama: true } },
                  },
                },
              },
              orderBy: ["name", "department"].includes(sortField)
                ? { user_data: { [sortField]: sortOrder } }
                : { [sortField]: sortOrder },
              skip,
              take: pageSize,
            });
        
            return TrxLeaveData.map((trx) => ({
              ...trx,
              leave_type_name: trx.leave_type?.title || "Unknown",
              start_date: trx.start_date
                ? new Date(trx.start_date).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })
                : null,
              end_date: trx.end_date
                ? new Date(trx.end_date).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })
                : null,
              user_name: trx.user_data?.name,
              user_departement: trx.user_data?.dept_data?.nama,
              status_submittion: getStatusName(trx?.status_id),
              actionType:
                ((trx.accept_to === userNrp && trx.approve_to === userNrp) || trx.approve_to === userNrp)
                  ? "Approved"
                  : trx.accept_to === userNrp
                  ? "Accepted"
                  : null,
              modalType: getModalType(trx, userNrp ?? ""),
            }));
          };
        
          if (exportQuery === "true") {
            const data = await getLeaveData();
        
            const formattedData = data.map((trx, index) => ({
              no: index + 1,
              name: trx.user_name ?? "-",
              department: trx.user_departement ?? "-",
              leaveType: trx.leave_type_name ?? "-",
              startDate: trx.start_date ?? "-",
              endDate: trx.end_date ?? "-",
              reason: trx.leave_reason ?? "-",
              status: trx.status_submittion ?? "-",
            }));
        
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Leave Report");
        
            worksheet.columns = [
              { header: "No", key: "no", width: 5 },
              { header: "Name", key: "name", width: 45 },
              { header: "Department", key: "department", width: 45 },
              { header: "Leave Type", key: "leaveType", width: 20 },
              { header: "Start Date", key: "startDate", width: 20 },
              { header: "End Date", key: "endDate", width: 20 },
              { header: "Reason", key: "reason", width: 40 },
              { header: "Status", key: "status", width: 20 },
            ];
        
            formattedData.sort((a, b) => a.name.localeCompare(b.name));
            worksheet.addRows(formattedData);
            worksheet.autoFilter = { from: 'A1', to: 'H1' };
        
            await generateExcelResponse(res, worksheet, data);
          } else {
            const data = await getLeaveData();
        
            const totalItems = await TrxLeave.count({
              where: buildWhereClause(),
            });
        
            const totalPages = Math.ceil(totalItems / pageSize);
        
            res.status(200).send(
              JSONbig.stringify({
                success: true,
                message: "Successfully retrieved leave data",
                data: {
                  data,
                  totalPages,
                  currentPage: pageNumber,
                  totalItems,
                },
              })
            );
          }
        } catch (err) {
          console.error("ERROR DI BE (leave):", err);
          res.status(500).json({
            success: false,
            message: "Error retrieving leave data",
          });
        }
        break;
      }
      case "overtime": {
        try {
            const isAdmin = userNrp === "P0120001";
            const validSortFields = ["name", "department", "check_in_ovt", "check_out_ovt", "note_ovt"];
            const sortField = validSortFields.includes(sort as string) ? (sort as string) : "user";
      
            const dateFilter = month && year ? {
              OR: [
                { check_in_ovt: { gte: startOfMonth, lt: endOfMonth } },
                { check_out_ovt: { gte: startOfMonth, lt: endOfMonth } },
              ],
            } : undefined;
      
            const buildWhereClause = () => ({
              AND: [
                ...(!isAdmin
                  ? [
                      {
                        OR: [
                          { accept_to: userNrp },
                          {
                            AND: [
                              { approve_to: userNrp },
                              { accepted_date: { not: null } },
                            ],
                          },
                          { user: userNrp },
                        ],
                      },
                    ]
                  : []),  
                {
                  OR: [
                    { user_data: { name: { contains: search as string } } },
                    { user_data: { department: { contains: search as string } } },
                    { note_ovt: { contains: search as string } },
                  ],
                },
                ...(statusFilter ? [statusFilter] : []),
                ...(dateFilter ? [dateFilter] : []),
              ],
            });

            const getOvertimeData = async () => {
            const TrxOvertimeData = await TrxOvertime.findMany({
              where: buildWhereClause(),
              include: {
                user_data: {
                  select: {
                    name: true,
                    department: true,
                    dept_data: {
                      select: {
                        nama: true,
                        depthead_nrp: true,
                        depthead_name: true,
                      },
                    },
                  },
                },
              },
              orderBy: ["name", "department"].includes(sortField)
                ? { user_data: { [sortField]: sortOrder } }
                : { [sortField]: sortOrder },
              skip,
              take: pageSize,
            });
      
            return TrxOvertimeData.map((trx) => ({
                ...trx,
                user_name: trx.user_data?.name,
                user_departement: trx.user_data?.dept_data?.nama,
                check_in: formatDateTime(trx.check_in_ovt),
                check_out: formatDateTime(trx.check_out_ovt),
                status_submittion: getStatusName(trx?.status_id),
                actionType:
                  ((trx.accept_to === userNrp && trx.approve_to === userNrp) || trx.approve_to === userNrp)
                    ? "Approved"
                    : trx.accept_to === userNrp
                    ? "Accepted"
                    : null,
                modalType: getModalType(trx, userNrp ?? ""),
              }));
            };

          if (exportQuery === "true") {
            const data = await getOvertimeData();
      
            const formattedData = data.map((trx, index) => ({
              no: index + 1,
              name: trx.user_name ?? "-",
              department: trx.user_departement ?? "-",
              checkIn: trx.check_in ?? "-",
              checkOut: trx.check_out ?? "-",
              reason: trx.note_ovt ?? "-",
              status: trx.status_submittion ?? "-",
            }));
      
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Overtime Report");
      
            worksheet.columns = [
              { header: "No", key: "no", width: 5 },
              { header: "Name", key: "name", width: 45 },
              { header: "Department", key: "department", width: 45 },
              { header: "Check In", key: "checkIn", width: 25 },
              { header: "Check Out", key: "checkOut", width: 25 },
              { header: "Reason", key: "reason", width: 40 },
              { header: "Status", key: "status", width: 20 },
            ];
      
            formattedData.sort((a, b) => a.name.localeCompare(b.name));
            worksheet.addRows(formattedData);
            worksheet.autoFilter = { from: "A1", to: "G1" };
      
            await generateExcelResponse(res, worksheet, data);
          } else {
            const data = await getOvertimeData();
      
            const totalItems = await TrxOvertime.count({
              where: buildWhereClause(),
            });
      
            const totalPages = Math.ceil(totalItems / pageSize);
      
            res.status(200).send(
              JSONbig.stringify({
                success: true,
                message: "Successfully retrieved overtime data",
                data: {
                  data,
                  totalPages,
                  currentPage: pageNumber,
                  totalItems,
                },
              })
            );
          }
        } catch (err) {
          console.error("ERROR DI BE (overtime):", err);
          res.status(500).json({
            success: false,
            message: "Error retrieving overtime data",
          });
        }
        break;
      }      
      case "officialTravel": {
        try {
            const isAdmin = userNrp === "P0120001";
            const validSortFields = ["name", "department", "start_date", "end_date", "purpose", "destination_city", "total_leave_days"];
            const sortField = validSortFields.includes(sort as string) ? (sort as string) : "user";
            const sortOrder = order === "desc" ? "desc" : "asc";
      
            const dateFilter = month && year ? {
              OR: [
                { start_date: { gte: startOfMonth, lt: endOfMonth } },
                { end_date: { gte: startOfMonth, lt: endOfMonth } },
              ],
            } : undefined;
      
            const buildWhereClause = () => ({
              AND: [
                ...(!isAdmin
                  ? [
                      {
                        OR: [
                          { accept_to: userNrp },
                          {
                            AND: [
                              { approve_to: userNrp },
                              { accepted_date: { not: null } },
                            ],
                          },
                          { user: userNrp },
                        ],
                      },
                    ]
                  : []),  
                {
                  OR: [
                    { user_data: { name: { contains: search as string } } },
                    { user_data: { department: { contains: search as string } } },
                    { purpose: { contains: search as string } },
                    { destination_city: { contains: search as string } },
                  ],
                  ...(Number(search) ? [
                    { total_leave_days: Number(search) },
                  ] : []),
                },
                ...(statusFilter ? [statusFilter] : []),
                ...(dateFilter ? [dateFilter] : []),
              ],
            });
  
            const getOfficialTravelData = async () => {
            const trxOfficialTravelData = await TrxOfficialTravel.findMany({
              where: buildWhereClause(),
              include: {
                user_data: {
                  select: {
                    name: true,
                    department: true,
                    superior: true,
                  },
                },
              },
              orderBy: ["name", "department"].includes(sortField)
                ? { user_data: { [sortField]: sortOrder } }
                : { [sortField]: sortOrder },
              skip,
              take: pageSize,
            });
      
            return trxOfficialTravelData.map((trx) => ({
              ...trx,
              user_name: trx.user_data?.name,
              user_departement: trx.user_data?.department,
              start_date: trx?.start_date
                ? new Date(trx.start_date).toLocaleDateString("id-ID", {
                    day: "2-digit", month: "long", year: "numeric"
                  })
                : null,
              end_date: trx?.end_date
                ? new Date(trx.end_date).toLocaleDateString("id-ID", {
                    day: "2-digit", month: "long", year: "numeric"
                  })
                : null,
              status_submittion: getStatusName(trx?.status_id),
              actionType:
                ((trx.accept_to === userNrp && trx.approve_to === userNrp) || trx.approve_to === userNrp)
                  ? "Approved"
                  : trx.accept_to === userNrp
                  ? "Accepted"
                  : null,
              modalType: getModalType(trx, userNrp ?? ""),
            }));
          };

          if (exportQuery === "true") {
            const data = await getOfficialTravelData();
            const formattedData = data.map((trx, index) => ({
              no: index + 1,
              name: trx.user_name ?? "-",
              department: trx.user_departement ?? "-",
              destinationCity: trx.destination_city ?? "-",
              startDate: trx.start_date ?? "-",
              endDate: trx.end_date ?? "-",
              purpose: trx.purpose ?? "-",
              status: trx.status_submittion ?? "-",
            }));
      
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Official Travel Report");
      
            worksheet.columns = [
              { header: "No", key: "no", width: 5 },
              { header: "Name", key: "name", width: 45 },
              { header: "Department", key: "department", width: 45 },
              { header: "Destination City", key: "destinationCity", width: 25 },
              { header: "Start Date", key: "startDate", width: 20 },
              { header: "End Date", key: "endDate", width: 20 },
              { header: "Purpose", key: "purpose", width: 40 },
              { header: "Status", key: "status", width: 20 },
            ];
      
            formattedData.sort((a, b) => a.name.localeCompare(b.name));
            worksheet.addRows(formattedData);
            worksheet.autoFilter = { from: "A1", to: "H1" };
      
            await generateExcelResponse(res, worksheet, data);
          } else {
            const data = await getOfficialTravelData();
      
            const totalItems = await TrxOfficialTravel.count({
              where: buildWhereClause(),
            });      
            const totalPages = Math.ceil(totalItems / pageSize);
      
            res.status(200).send(
              JSONbig.stringify({
                success: true,
                message: "Successfully retrieved official travel data",
                data: {
                  data,
                  totalPages,
                  currentPage: pageNumber,
                  totalItems,
                },
              })
            );
          }
        } catch (err) {
          console.error("ERROR DI BE (officialTravel):", err);
          res.status(500).json({
            success: false,
            message: "Error retrieving official travel data",
          });
        }
        break;
      }
      case "mutation": {
        try {
            const isAdmin = userNrp === "P0120001";
            const validSortFields = ["name", "departement", "effective_date", "reason"];
            const sortField = validSortFields.includes(sort as string) ? (sort as string) : "user";
            const sortOrder = order === "desc" ? "desc" : "asc";
    
            const dateFilter = month && year ? {
              OR: [
                {
                  effective_date: {
                    gte: startOfMonth,
                    lt: endOfMonth,
                  },
                },
              ],
            } : undefined;
    
            const buildWhereClause = () => ({
              AND: [
                ...(!isAdmin
                  ? [
                      {
                        OR: [
                          { accept_to: userNrp },
                          {
                            AND: [
                              { approve_to: userNrp },
                              { accepted_date: { not: null } },
                            ],
                          },
                          { user: userNrp },
                        ],
                      },
                    ]
                  : []),  
                {
                  OR: [
                    { user_data: { name: { contains: search as string } } },
                    { user_data: { department: { contains: search as string } } },
                  ],
                  ...(Number(search) ? [
                    { effective_date: Number(search) },
                  ] : []),
                },
                ...(statusFilter ? [statusFilter] : []),
                ...(dateFilter ? [dateFilter] : []),
              ],
            });

            const getMutationData = async () => {
            const trxMutationData = await TrxMutation.findMany({
              where: buildWhereClause(),
              include: {
                user_data: {
                  select: {
                    name: true,
                    department: true,
                    superior: true,
                  },
                },
              },
              orderBy: ["name", "departement"].includes(sortField)
                ? { user_data: { [sortField]: sortOrder } }
                : { [sortField]: sortOrder },
              skip,
              take: pageSize,
            });
    
            return trxMutationData.map((trx) => ({
              ...trx,
              user_name: trx.user_data?.name,
              user_departement: trx.user_data?.department,
              effective_date: trx?.effective_date
                ? new Date(trx.effective_date).toLocaleString("id-ID", {
                    day: "2-digit", month: "long", year: "numeric"
                  })
                : null,
              status_submittion: getStatusName(trx?.status_id),
              actionType:
                ((trx.accept_to === userNrp && trx.approve_to === userNrp) || trx.approve_to === userNrp)
                  ? "Approved"
                  : trx.accept_to === userNrp
                  ? "Accepted"
                  : null,
              modalType: getModalType(trx, userNrp ?? ""),
            }));
          };

    
          if (exportQuery === "true") {
            const data = await getMutationData();
            const formattedData = data.map((trx, index) => ({
              no: index + 1,
              name: trx.user_name ?? "-",
              department: trx.user_departement ?? "-",
              effectiveDate: trx.effective_date ?? "-",
              reason: trx.reason ?? "-",
              status: trx.status_submittion ?? "-",
            }));
    
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Mutation Report");
    
            worksheet.columns = [
              { header: "No", key: "no", width: 5 },
              { header: "Name", key: "name", width: 45 },
              { header: "Department", key: "department", width: 45 },
              { header: "Effective Date", key: "effectiveDate", width: 20 },
              { header: "Reason", key: "reason", width: 40 },
              { header: "Status", key: "status", width: 20 },
            ];
    
            formattedData.sort((a, b) => a.name.localeCompare(b.name));
            worksheet.addRows(formattedData);
            worksheet.autoFilter = { from: "A1", to: "F1" };
    
            await generateExcelResponse(res, worksheet, data);
          } else {
            const data = await getMutationData();
    
            const totalItems = await TrxMutation.count({
              where: buildWhereClause(),
            });
    
            const totalPages = Math.ceil(totalItems / pageSize);
    
            res.status(200).send(
              JSONbig.stringify({
                success: true,
                message: "Successfully retrieved mutation data",
                data: {
                  data,
                  totalPages,
                  currentPage: pageNumber,
                  totalItems,
                },
              })
            );
          }
        } catch (err) {
          console.error("ERROR DI BE (mutation):", err);
          res.status(500).json({
            success: false,
            message: "Error retrieving mutation data",
          });
        }
        break;
    }    
    case "resign": {
        try {
            const isAdmin = userNrp === "P0120001";
            const validSortFields = ["name", "departement", "effective_date", "reason"];
            const sortField = validSortFields.includes(sort as string) ? (sort as string) : "user";
            const sortOrder = order === "desc" ? "desc" : "asc";
      
            const dateFilter = month && year ? {
              OR: [
                {
                  effective_date: {
                    gte: startOfMonth,
                    lt: endOfMonth,
                  },
                },
              ],
            } : undefined;
            const buildWhereClause = () => ({
              AND: [
                {
                  OR: [
                    { accept_to: userNrp },
                    {
                      AND: [
                        { approve_to: userNrp },
                        { accepted_date: { not: null } },
                      ],
                    },
                    { user: userNrp },
                  ],
                },
                {
                  OR: [
                    { user_data: { name: { contains: search as string } } },
                    { user_data: { department: { contains: search as string } } },
                  ],
                },
                ...(statusFilter ? [statusFilter] : []),
                ...(dateFilter ? [dateFilter] : []),
              ],
            });
          
            const getResignData = async () => {
            const trxResignData = await TrxResign.findMany({
              where: buildWhereClause(),
              include: {
                user_data: {
                  select: {
                    name: true,
                    department: true,
                    superior: true,
                  },
                },
              },
              orderBy: ["name", "departement"].includes(sortField)
                ? { user_data: { [sortField]: sortOrder } }
                : { [sortField]: sortOrder },
              skip,
              take: pageSize,
            });
      
            return trxResignData.map((trx) => ({
              ...trx,
              user_name: trx.user_data?.name,
              user_departement: trx.user_data?.department,
              effective_date: trx?.effective_date
                ? new Date(trx.effective_date).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })
                : null,
              status_submittion: getStatusName(trx?.status_id),
              actionType:
                ((trx.accept_to === userNrp && trx.approve_to === userNrp) || trx.approve_to === userNrp)
                  ? "Approved"
                  : trx.accept_to === userNrp
                  ? "Accepted"
                  : null,
              modalType: getModalType(trx, userNrp ?? ""),
            }));
          };
      
          if (exportQuery === "true") {
            const data = await getResignData();
            const formattedData = data.map((trx, index) => ({
              no: index + 1,
              name: trx.user_name ?? "-",
              department: trx.user_departement ?? "-",
              effectiveDate: trx.effective_date ?? "-",
              reason: trx.reason ?? "-",
              status: trx.status_submittion ?? "-",
            }));
      
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Resign Report");
      
            worksheet.columns = [
              { header: "No", key: "no", width: 5 },
              { header: "Name", key: "name", width: 45 },
              { header: "Department", key: "department", width: 45 },
              { header: "Effective Date", key: "effectiveDate", width: 20 },
              { header: "Reason", key: "reason", width: 40 },
              { header: "Status", key: "status", width: 20 },
            ];
      
            formattedData.sort((a, b) => a.name.localeCompare(b.name));
            worksheet.addRows(formattedData);
            worksheet.autoFilter = { from: "A1", to: "F1" };
      
            await generateExcelResponse(res, worksheet, data);
          } else {
            const data = await getResignData();
      
            const totalItems = await TrxResign.count({
              where: buildWhereClause(),
            });
      
            const totalPages = Math.ceil(totalItems / pageSize);
      
            res.status(200).send(
              JSONbig.stringify({
                success: true,
                message: "Successfully retrieved resign data",
                data: {
                  data,
                  totalPages,
                  currentPage: pageNumber,
                  totalItems,
                },
              })
            );
          }
        } catch (err) {
          console.error("ERROR DI BE (resign):", err);
          res.status(500).json({
            success: false,
            message: "Error retrieving resign data",
          });
        }
        break;
      }
      
      default:
        res.status(400).json({ success: false, message: "Invalid type" });
    }
  } catch (error) {
    console.error("ERROR getAllTrxData:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


export const handleTrx = async (req: Request & { user?: { nrp: string } }, res: Response): Promise<void> => {
  const { id } = req.params;
  const { remark, trxType, actionType } = req.body;
  const userNrp = req.user?.nrp;

  if (!remark) {
     res.status(400).json({
      success: false,
      message: "Remark must be provided and cannot be empty",
    });
  }

  const now = getCurrentWIBDate();
  let updateData: any = { updated_at: now };

  try {
    const model = trxModelMap[trxType];
    const trxData = await model.findUnique({
      where: { id: Number(id) },
      select: {
        accept_to: true,
        approve_to: true,
      },
    });

    if (!trxData) {
       res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    const isAcc = userNrp === trxData.accept_to;
    const isApp = userNrp === trxData.approve_to;

    if (actionType === "Rejected") {
      updateData = {
        ...updateData,
        status_id: 6,
        rejected: userNrp,
        rejected_remark: remark,
        rejected_date: now,
      };

      if (trxType === "leave") {
        const trxDetail = await model.findUnique({
          where: { id: Number(id) },
          select: {
            user: true,
            total_leave_days: true,
            leave_type_id: true,
          },
        });

        if (trxDetail?.user && trxDetail?.leave_type_id && trxDetail?.total_leave_days) {
          const leaveQuota = await TrxLeaveQuota.findFirst({
            where: {
              id_user: trxDetail.user,
              leaves_type_id: trxDetail.leave_type_id,
            },
          });

          if (leaveQuota && leaveQuota.id_user === trxDetail.user) {
            await TrxLeaveQuota.update({
              where: { id: leaveQuota.id },
              data: {
                leave_balance: {
                  increment: Number(trxDetail.total_leave_days),
                },
                used_leave: {
                  decrement: Number(trxDetail.total_leave_days),
                },
                updated_at: now,
              },
            });
          }          
        }
      }

    } else if (actionType === "Canceled") {
      updateData = {
        ...updateData,
        status_id: 7,
        canceled: userNrp,
        canceled_remark: remark,
        canceled_date: now,
      };

      if (trxType === "leave") {
        const trxDetail = await model.findUnique({
          where: { id: Number(id) },
          select: {
            user: true,
            total_leave_days: true,
            leave_type_id: true,
          },
        });

        if (trxDetail?.user && trxDetail?.leave_type_id && trxDetail?.total_leave_days) {
          const leaveQuota = await TrxLeaveQuota.findFirst({
            where: {
              id_user: trxDetail.user,
              leaves_type_id: trxDetail.leave_type_id,
            },
          });

          if (leaveQuota && leaveQuota.id_user === userNrp) {
            await TrxLeaveQuota.update({
              where: { id: leaveQuota.id },
              data: {
                leave_balance: {
                  increment: Number(trxDetail.total_leave_days),
                },
                used_leave: {
                  decrement: Number(trxDetail.total_leave_days),
                },
                updated_at: now,
              },
            });
          }
        }
      }

    } else {
      if (!isAcc && !isApp) {
         res.status(403).json({
          success: false,
          message: "You are not authorized to perform this action.",
        });
      }

      // Approval flow
      if (isAcc && isApp) {
        updateData = {
          ...updateData,
          status_id: 3,
          accepted: userNrp,
          accepted_remark: remark,
          accepted_date: now,
          approved: userNrp,
          approved_remark: remark,
          approved_date: now,
        };
      } else if (isAcc) {
        updateData = {
          ...updateData,
          status_id: 2,
          accepted: userNrp,
          accepted_remark: remark,
          accepted_date: now,
        };
      } else if (isApp) {
        updateData = {
          ...updateData,
          status_id: 3,
          approved: userNrp,
          approved_remark: remark,
          approved_date: now,
        };
      }
    }

    const result = await model.update({
      where: { id: Number(id) },
      data: updateData,
    });

    res.status(200).send(JSONbig.stringify({
      success: true,
      message: `Transaction updated successfully`,
      data: result,
    }));
  } catch (err) {
    console.error("Error in handleTrx:", err);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: err instanceof Error ? err.message : err,
    });
  }
};


export const createSubmittion = async (req: Request & { user?: { nrp: string, id : number } }, res: Response): Promise<void> => {
  try {
    const {
      type = "",
    } = req.query;
    const userNrp = req.user?.nrp ?? "";
    const userId = req.user?.id ?? 0;

    switch(type){
      case "leave": {
        const { leave_type_id, start_date, end_date, leave_reason } = req.body;
      
        if (!leave_type_id || !start_date || !end_date || !leave_reason) {
          res.status(400).json({
            success: false,
            message: "All fields must be provided and cannot be empty",
          });
          return;
        }
      
        const userData = await User.findUnique({
          where: { personal_number: userNrp },
          include: {
            dept_data: {
              select: {
                id: true,
                depthead_nrp: true,
              },
            },
          },
        });
      
        const acceptToValue = userData?.superior ?? "";
        const approveToValue = userData?.dept_data?.depthead_nrp ?? "";
        const deptValue = userData?.dept ?? 0;
      
        const totalLeaveDays = differenceInDays(new Date(end_date), new Date(start_date)) + 1;
        const quotaData = await TrxLeaveQuota.findFirst({
          where: {
            id_user: userNrp,
            leaves_type_id: leave_type_id,
            is_active: 0,
            is_deleted: 0,
          },
        });
      
        if (!quotaData) {
          res.status(400).json({
            success: false,
            message: "Leave quota not found or inactive",
          });
          return;
        }
      
        const currentUsedLeave = quotaData.used_leave || 0;
        const currentBalance = quotaData.leave_balance || 0;
        const newUsedLeave = currentUsedLeave + totalLeaveDays;
        const newBalance = currentBalance - totalLeaveDays;
      
        if (newBalance < 0) {
          res.status(400).json({
            success: false,
            message: "Insufficient leave balance",
          });
          return;
        }
      
        try {
          const newLeave = await TrxLeave.create({
            data: {
              user: userNrp,
              dept: deptValue,
              status_id: 1,
              leave_type_id,
              start_date: new Date(start_date),
              end_date: new Date(end_date),
              flag_leaves: 1,
              total_leave_days: totalLeaveDays,
              leave_reason,
              accept_to: acceptToValue,
              approve_to: approveToValue,
              created_by: userId,
              created_at: getCurrentWIBDate(),
              updated_by: userId,
              updated_at: getCurrentWIBDate(),
            },
          });
      
          await TrxLeaveQuota.update({
            where: { id: quotaData.id },
            data: {
              used_leave: newUsedLeave,
              leave_balance: newBalance,
              updated_at: getCurrentWIBDate(),
            },
          });
      
          res.status(201).send(JSONbig.stringify({
            success: true,
            message: "Leave added successfully",
            data: { newLeave },
          }));
        } catch (error) {
          console.error("Error during leave submission:", error);
          res.status(500).json({
            success: false,
            message: "Internal server error during leave submission",
          });
        }
        break;
      }      
      case "overtime": {
        const { check_in_ovt, check_out_ovt, note_ovt } = req.body;
        
        if (!check_in_ovt || !check_out_ovt || !note_ovt) {
            res.status(400).json({
                success: false,
                message: "All fields must be provided and cannot be empty",
            });
        }
            const userData = await User.findUnique({
            where: { personal_number: userNrp },
            include: {
                dept_data: {
                    select: {
                        id: true,
                        depthead_nrp: true,
                  },
                },
            },
        });
    
        const acceptToValue = userData?.superior ?? "";
        const approveToValue = userData?.dept_data.depthead_nrp ?? "";
        const deptValue = userData?.dept ?? 0;
        console.log("nrp ovt", userNrp);

        const shiftData = await TrxShiftEmployee.findFirst({
            where: {
                id_user: userNrp,
            },
            include: {
                MsShiftGroup: {
                    select: {
                        code: true,
                    },
                },
            },
        });
    
        if (!shiftData) {
               res.status(404).json({
                success: false,
                message: "No shift data found for the user",
            });
        }
    
        const checkInDate = new Date(check_in_ovt);
        const indexDay = checkInDate.getDay();
        
        // Map the indexDay to the corresponding day name (e.g., 0 -> "Sunday", 1 -> "Monday")
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const dayName = dayNames[indexDay]; // Get the day name corresponding to indexDay
        
        console.log("Day Name: ", dayName); // Log the day name to see it
        
        // Fetch shift group data based on the shift code and day name
        const shiftGroupData = await ShiftGroup.findFirstDetail({
            where: {
                code: shiftData?.id_shift_group,
                index_day: dayName, // Use the day name (e.g., "Monday") instead of the indexDay number
            },
        });
    
        if (!shiftGroupData) {
             res.status(404).json({
                success: false,
                message: "No shift group data found for the user",
            });
        }
    
        // Now fetch the shift master based on shift group and day name
        const shiftMaster = await Shift.findFirst({
            where: {
                code: shiftGroupData?.id_shift,
            },
            include: {
                details: {
                    select: {
                        id_shift: true,
                        id_shift_group: true,
                    },
                },
            },
        });
    
        if (!shiftMaster || !shiftMaster.id) {
              res.status(404).json({
              success: false,
              message: "No shift found for the specified shift group",
            });
        }
    
        const shiftId = shiftMaster?.code ?? "";
      
        const newOvertime = await TrxOvertime.create({
            data: {
                user: userNrp,
                dept: deptValue,
                shift: shiftId,
                status_id: 1,
                check_in_ovt: new Date(check_in_ovt),
                check_out_ovt: new Date(check_out_ovt),
                note_ovt: note_ovt,
                accept_to: acceptToValue,
                approve_to: approveToValue,
                created_by: userId,
                created_at: getCurrentWIBDate(),
                updated_at: getCurrentWIBDate(),
            },
        });
    
        // Kirim response
        res.status(201).send(JSONbig.stringify({
            success: true,
            message: "Overtime added successfully",
            data: { newOvertime },
        }));
    
        break;
    }    
      case "officialTravel": {
        const { start_date, end_date, purpose, destination_city } = req.body;
  
        if (!start_date || !end_date || !purpose || !destination_city) {
          res.status(400).json({
            success: false,
            message: "All fields must be provided and cannot be empty",
          });
        }
        const userData = await User.findUnique({
          where: { personal_number: userNrp },
          include: {
            dept_data: {
              select: {
                id: true,
                depthead_nrp: true,
              },
            },
            
          },
        });
        const totalTravelDays = differenceInDays(end_date, start_date) + 1;
        const acceptToValue = userData?.superior ?? ""
        const approveToValue = userData?.dept_data.depthead_nrp ?? ""
        const newLeave = await TrxOfficialTravel.create({
          data: {
            user: userNrp,
            status_id: 1,
            start_date: new Date(start_date),
            end_date: new Date(end_date),
            total_leave_days: totalTravelDays,
            purpose,
            destination_city,
            accept_to: acceptToValue,
            approve_to: approveToValue,
            created_by: userId,
            created_at: getCurrentWIBDate(),
            updated_by: userId,
            updated_at: getCurrentWIBDate(),
          },
        });
    
        res.status(201).send(JSONbig.stringify({
          success: true,
          message: "Official Travel added successfully",
          data: { newLeave },
        }));
      break
      }

      case "mutation": {
        const { division_to, department_to, division_from, department_from, effective_date, reason } = req.body;
  
      if ( !division_to || !department_to || !division_from || !department_from|| !effective_date || !reason ) {
        res.status(400).json({
          success: false,
          message: "All fields must be provided and cannot be empty",
        });
      }
      const userData = await User.findUnique({
        where: { personal_number: userNrp },
        include: {
          dept_data: {
            select: {
              id: true,
              depthead_nrp: true,
            },
          },
          
        },
      });
    
      const acceptToValue = userData?.superior ?? ""
      const approveToValue = userData?.dept_data.depthead_nrp ?? ""
      const newMutation = await TrxMutation.create({
        data: {
          user: userNrp,
          status_id: 1,
          effective_date: new Date(effective_date),
          division_from: division_from,
          dept_from: department_from,
          division_to: division_to,
          dept_to: department_to,
          reason,
          accept_to: acceptToValue,
          approve_to: approveToValue,
          created_by: userId,
          created_at: getCurrentWIBDate(),
          updated_by: userId,
          updated_at: getCurrentWIBDate(),
        },
      });
  
      res.status(201).send(JSONbig.stringify({
        success: true,
        message: "Mutation added successfully",
        data: { newMutation },
      }));
        break
      }

      case "resign": {
      const { effective_date, reason } = req.body;
      if (!effective_date || !reason ) {
        res.status(400).json({
          success: false,
          message: "All fields must be provided and cannot be empty",
        });
        return;
      }
      const userData = await User.findUnique({
        where: { personal_number: userNrp },
        include: {
          dept_data: {
            select: {
              id: true,
              depthead_nrp: true,
            },
          },
          
        },
      });

      const acceptToValue = userData?.superior ?? ""
      const approveToValue = userData?.dept_data.depthead_nrp ?? ""
      const newresign = await TrxResign.create({
        data: {
          user: userNrp,
          status_id: 1,
          effective_date: new Date(effective_date),
          reason,
          accept_to: acceptToValue,
          approve_to: approveToValue,
          created_by: userId,
          created_at: getCurrentWIBDate(),
          updated_by: userId,
          updated_at: getCurrentWIBDate(),
        },
      });
  
      res.status(201).send(JSONbig.stringify({
        success: true,
        message: "resign added successfully",
        data: { newresign },
      }));
      break
      }
    }
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating request",
      error: error instanceof Error ? error.message : error,
    });
  }
};

export const getTrendAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { month } = req.query;

    if (!month || typeof month !== 'string') {
      res.status(400).json({ message: 'Parameter "month" harus dalam format yyyy-mm' });
      return;
    }

    const [year, monthNum] = month.split('-').map(Number);
    if (!year || !monthNum || monthNum < 1 || monthNum > 12) {
      res.status(400).json({ message: 'Format "month" tidak valid, gunakan yyyy-mm' });
      return;
    }

    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);

    const trendData = await Attendance.findMany({
      where: {
        in_time: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        in_time: 'asc',
      },
    });

    const trendMap: Record<string, number> = {};
    trendData.forEach((item:any) => {
      if (item.in_time) {
        const dateStr = item.in_time.toISOString().split('T')[0];
        trendMap[dateStr] = (trendMap[dateStr] || 0) + 1;
      }
    });

    const totalDays = endDate.getDate();
    const formattedData = Array.from({ length: totalDays }, (_, i) => {
      const day = i + 1;
      const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return {
        tanggal: dateStr,
        jumlah_kehadiran: trendMap[dateStr] || 0,
      };
    });

    res.status(200).json(formattedData);
  } catch (err) {
    console.error('Error fetching attendance trend:', err);
    res.status(500).json({ message: 'Error fetching attendance trend', error: err });
  }
};

export const getTrendSubmission = async (req: Request & { user?: { nrp: string } }, res: Response): Promise<void> => {
  try {
    const { type, year } = req.query;
    const userNrp = req.user?.nrp;
    const selectedYear = year ? parseInt(year as string) : new Date().getFullYear();
    const startOfYear = new Date(`${selectedYear}-01-01`);
    const endOfYear = new Date(`${selectedYear}-12-31`);

    let transactions: { start_date: Date }[] = [];

    switch (type) {
      case 'leave':
        transactions = await TrxLeave.findMany({
          where: {
            start_date: {
              gte: startOfYear,
              lte: endOfYear,
            },
            OR: [
              { accept_to: userNrp },
              {
                AND: [
                  { approve_to: userNrp },
                  { accepted_date: { not: null } },
                ],
              },
              { user: userNrp },
            ],
          },
          select: {
            start_date: true,
          },
        });
        break;

      case 'overtime':
        const overtime = await TrxOvertime.findMany({
          where: {
            check_in_ovt: {
              gte: startOfYear,
              lte: endOfYear,
            },
            OR: [
              { accept_to: userNrp },
              {
                AND: [
                  { approve_to: userNrp },
                  { accepted_date: { not: null } },
                ],
              },
              { user: userNrp },
            ],
          },
          select: {
            check_in_ovt: true,
          },
        });
        transactions = overtime.map(item => ({ start_date: item.check_in_ovt }));
        break;

      case 'officialTravel':
        transactions = await TrxOfficialTravel.findMany({
          where: {
            start_date: {
              gte: startOfYear,
              lte: endOfYear,
            },
            OR: [
              { accept_to: userNrp },
              {
                AND: [
                  { approve_to: userNrp },
                  { accepted_date: { not: null } },
                ],
              },
              { user: userNrp },
            ],
          },
          select: {
            start_date: true,
          },
        });
        break;

      case 'mutation':
        const mutation = await TrxMutation.findMany({
          where: {
            effective_date: {
              gte: startOfYear,
              lte: endOfYear,
            },
            OR: [
              { accept_to: userNrp },
              {
                AND: [
                  { approve_to: userNrp },
                  { accepted_date: { not: null } },
                ],
              },
              { user: userNrp },
            ],
          },
          select: {
            effective_date: true,
          },
        });
        transactions = mutation.map(item => ({ start_date: item.effective_date }));
        break;

      case 'resign':
        const resign = await TrxResign.findMany({
          where: {
            effective_date: {
              gte: startOfYear,
              lte: endOfYear,
            },
            OR: [
              { accept_to: userNrp },
              {
                AND: [
                  { approve_to: userNrp },
                  { accepted_date: { not: null } },
                ],
              },
              { user: userNrp },
            ],
          },
          select: {
            effective_date: true,
          },
        });
        transactions = resign.map(item => ({ start_date: item.effective_date }));
        break;

      default:
        res.status(400).json({ error: 'Invalid type. Must be leave, overtime, officialTravel, mutation, or resign.' });
        return;
    }

    const monthlyCounts = Array(12).fill(0);

    transactions.forEach((trx) => {
      const monthIndex = trx.start_date.getMonth();
      monthlyCounts[monthIndex]++;
    });

    res.status(200).json({ type, data: monthlyCounts });
  } catch (error) {
    console.error('[getAllSubmission]', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};