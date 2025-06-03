import JSONbig from "json-bigint";
import { Request, Response } from "express";
import { TrxLeave } from "../../models/Table/Satria/TrxLeave";
import { TrxOvertime } from "../../models/Table/Satria/TrxOvertime";
import { TrxOfficialTravel } from "../../models/Table/Satria/TrxOfficialTravel";
import { TrxMutation } from "../../models/Table/Satria/TrxMutation";
import { TrxResign } from "../../models/Table/Satria/TrxResign";
import { TrxLeaveQuota } from "../../models/Table/Satria/TrxLeaveQuota";
import { getCurrentWIBDate } from "../../helpers/timeHelper";
import { getStatusName, getModalType, generateExcelResponse, isUserDeptHead, isUserDivHead, getSelect, formatRupiah } from "../../helpers/functionHelper";
import { User } from "../../models/Table/Satria/MsUser";
import { differenceInDays  } from "date-fns";
import ExcelJS from "exceljs";
import { TrxShiftEmployee } from "../../models/Table/Satria/TrxShiftEmployee";
import { ShiftGroup } from "../../models/Table/Satria/MsShiftGroup";
import { Shift } from "../../models/Table/Satria/MsShift";
import { Attendance } from "../../models/Table/Satria/TrxAttendance";
import { TrxDeclaration } from "../../models/Table/Satria/TrxDeclaration";
import { MsDivision } from "../../models/Table/Satria/MsDivision";


const trxModelMap: { [key: string]: any } = {
  leave: TrxLeave,
  overtime: TrxOvertime,
  officialTravel: TrxOfficialTravel,
  mutation: TrxMutation,
  resign: TrxResign,
  declaration: TrxDeclaration,
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

export const getAllTrxData = async (req: Request & { user?: { nrp: string, dept_head: number } }, res: Response): Promise<void> => {
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
    const isDeptHead = await isUserDeptHead(userNrp ?? "");
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
            const userNrp = req.user?.nrp ?? "";
            const isDeptHead = await isUserDeptHead(userNrp);
            const isDivHead = await isUserDivHead(userNrp);
            const isDicDiv = userNrp === "P0120008";
            const isDeptHeadHc = userNrp === "P0120010";
            const isDivHeadHc = userNrp === "P0120014";
            const isDicHc = userNrp === "P0120009";
            const isPresdir = userNrp === "P0120011";
            const isAdmin = userNrp === "P0120001";

            let roleFilter: Record<string, any> = { user: userNrp };

            if (isDeptHead) roleFilter = { accept_to_depthead: userNrp };
            if (isDivHead) roleFilter = { approve_to_divhead: userNrp };
            if (isDicDiv) roleFilter = { approve_to_dicdiv: userNrp };
            if (isDeptHeadHc) roleFilter = { approve_to_depthead_hc: userNrp };
            if (isDivHeadHc) roleFilter = { approve_to_divhead_hc: userNrp };
            if (isDicHc) roleFilter = { approve_to_dichc: userNrp };
            if (isPresdir) roleFilter = { approve_to_presdir: userNrp };
            if (isAdmin) roleFilter = {};

            const validSortFields = ["name", "department", "start_date", "end_date", "purpose", "destination_city", "total_leave_days"];
            const sortField = validSortFields.includes(sort as string) ? (sort as string) : "user";
            const sortOrder = order === "desc" ? "desc" : "asc";

            const dateFilter = month && year ? {
              OR: [
                { start_date: { gte: startOfMonth, lt: endOfMonth } },
                { end_date: { gte: startOfMonth, lt: endOfMonth } },
              ],
            } : undefined;

            const searchFilter = {
              OR: [
                { user_data: { name: { contains: search as string } } },
                { user_data: { department: { contains: search as string } } },
                { purpose: { contains: search as string } },
                { destination_city: { contains: search as string } },
                ...(Number(search) ? [{ total_leave_days: Number(search) }] : []),
              ],
            };
            const buildWhereClause = () => ({
            AND: [
              ...(isAdmin ? [] : [roleFilter]),
              searchFilter,
              ...(statusFilter ? [statusFilter] : []),
              ...(dateFilter ? [dateFilter] : []),
              ...(isDivHead ? [{ accepted_depthead: { not: null } }] : []),
              ...(isDicDiv ? [{ approved_divhead: { not: null } }] : []),
              ...(isDeptHeadHc
                  ? [
                      {
                        OR: [
                          { code: { startsWith: "TRF2" } }, 
                          {
                            AND: [
                              { code: { not: { startsWith: "TRF2" } } }, 
                              { approved_dicdiv: { not: null } },
                            ],
                          },
                        ],
                      },
                    ]
                  : []),              
              ...(isDivHeadHc ? [{ approved_depthead_hc: { not: null } }] : []),
              ...(isDicHc ? [{ approved_divhead_hc: { not: null } }] : []),
              ...(isPresdir ? [{ approved_dicdiv: { not: null } }] : []),
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
                      division: true,
                      worklocation_name: true,
                      title: true,
                    },
                  },
                },
                orderBy: ["name", "department"].includes(sortField)
                  ? { user_data: { [sortField]: sortOrder } }
                  : { [sortField]: sortOrder },
                skip,
                take: pageSize,
              });

            const declarationTrx = await TrxDeclaration.findMany({
              where: {
                code_trx: {
                  in: trxOfficialTravelData.map((trx) => trx.code),
                },
              },
              select: { code_trx: true },
            });

            const divHeadData = await MsDivision.findFirst({
              where: {
                divhead_nrp: userNrp
              }
            });

            const isDivHead = !!divHeadData;

            const declarationTrxSet = new Set(declarationTrx.map((d:any) => d.code_trx));
            return trxOfficialTravelData.map((trx) => ({
              ...trx,
              code_trx: trx.code,
              user_name: trx.user_data?.name,
              user_departement: trx.user_data?.department,
              user_division: trx.user_data?.division,
              user_position: trx.user_data?.title,
              worklocation_name: trx.user_data?.worklocation_name,
              down_payment: trx.down_payment
                    ? formatRupiah(trx.down_payment)
                    : null,
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
              actionType :
              [
                trx?.accept_to_depthead,
              ].includes(userNrp)
                ? "Accepted"
                : [
                    trx?.approve_to_divhead,
                    trx?.approve_to_dicdiv,
                    trx?.approve_to_depthead_hc,
                    trx?.approve_to_divhead_hc,
                    trx?.approve_to_dichc,
                    trx?.approve_to_presdir,
                  ].includes(userNrp)
                ? "Approved"
                : null,
              modalType: getModalType(trx, userNrp ?? ""),
              isDeclaration: declarationTrxSet.has(trx.code),
              is_downPayment: isDivHead,
              statusUser:
              isAdmin ? "Admin" :
              isPresdir ? "Presdir" :
              isDicHc ? "DicHC" :
              isDivHeadHc ? "DivHeadHC" :
              isDeptHeadHc ? "DeptHeadHC" :
              isDicDiv ? "DicDiv" :
              isDivHead ? "DivHead" :
              isDeptHead ? "DeptHead" :
              "User",
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
    
            const buildWhereClause = () => {
              const andConditions: any[] = [];
              if (!isAdmin && !isDeptHead) {
                andConditions.push({
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
                });
              }

              if (isDeptHead) {
                andConditions.push({
                  created_by: userNrp,
                });
              }

              if (search) {
                andConditions.push({
                  OR: [
                    { user_data: { name: { contains: search as string } } },
                    { user_data: { department: { contains: search as string } } },
                  ],
                });

                if (!isNaN(Number(search))) {
                  andConditions.push({
                    effective_date: Number(search),
                  });
                }
              }
              if (statusFilter) {
                andConditions.push(statusFilter);
              }

              if (dateFilter) {
                andConditions.push(dateFilter);
              }

              return {
                AND: andConditions,
              };
            };

            const getMutationData = async () => {
            const trxMutationData = await TrxMutation.findMany({
              where: buildWhereClause(),
              include: {
                user_data: {
                  select: {
                    name: true,
                    department: true,
                    superior: true,
                    worklocation_name: true,
                    title: true,
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
              file_url: trx.file_upload ? `/uploads/file_resign/${trx.file_upload}` : null,
              
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
            const alreadyResign = data.some(trx => trx.user === userNrp);

            res.status(200).send(
              JSONbig.stringify({
                success: true,
                message: "Successfully retrieved resign data",
                data: {
                  data,
                  totalPages,
                  currentPage: pageNumber,
                  totalItems,
                  alreadyResign,
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
      case "declaration": {
        try {
        const isAdmin = userNrp === "P0120001";
        const validSortFields = ["code", "user", "code_trx", "start_date_actual", "end_date_actual" ];
        const sortField = validSortFields.includes(sort as string) ? (sort as string) : "code";
        const sortOrder = order === "desc" ? "desc" : "asc";

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
                { code_trx: { contains: search as string } },
              ],
            },
            ...(statusFilter ? [statusFilter] : []),
          ],
        });
        const declarationData = await TrxDeclaration.findMany({
        where: buildWhereClause(),
        include: {
          officialTravel_data: {
            include: {
              user_data: true, 
            },
          },
          trx_detail_declaration: true,
        },
        orderBy: {
          [sortField]: sortOrder,
        },
        skip,
        take: pageSize,
      });
      const formattedData = declarationData.map((declaration) => ({
        ...declaration,
        user_name: declaration.officialTravel_data?.user_data?.name || null,
        user_department: declaration.officialTravel_data?.user_data?.department || null,
        user_division: declaration.officialTravel_data?.user_data?.division || null,
        user_position: declaration.officialTravel_data?.user_data?.title || null,
        total_cost: declaration.officialTravel_data?.total_cost || null,
        currency: declaration.officialTravel_data?.currency || null,
        symbol_currency: declaration.officialTravel_data?.symbol_currency || null,
        lodging: declaration.officialTravel_data?.lodging || null,
        destination_city: declaration.officialTravel_data?.destination_city || null,
        worklocation_name: declaration.officialTravel_data?.user_data?.worklocation_name || null,
        work_status: declaration.officialTravel_data?.work_status || null,
        down_payment: declaration.officialTravel_data?.down_payment
          ? formatRupiah(declaration.officialTravel_data.down_payment)
          : null,    
        total_cost_detail: declaration.trx_detail_declaration?.[0]?.total_cost
          ? formatRupiah(declaration.trx_detail_declaration[0].total_cost)
          : null,
        total_money_change: declaration.total_money_change
          ? formatRupiah(declaration.total_money_change)
          : null,
        start_date: declaration.officialTravel_data?.start_date
          ? new Date(declaration.officialTravel_data?.start_date).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })
          : null,

        end_date: declaration.officialTravel_data?.end_date
          ? new Date(declaration.officialTravel_data?.end_date).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })
          : null,

          start_date_actual: declaration?.start_date_actual
          ? new Date(declaration.officialTravel_data?.start_date).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })
          : null,

        end_date_actual: declaration?.end_date_actual
          ? new Date(declaration.officialTravel_data?.end_date).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })
          : null,
        actionType:
          ((declaration.accept_to === userNrp && declaration.approve_to === userNrp) || declaration.approve_to === userNrp)
          ? "Approved"
          : declaration.accept_to === userNrp
          ? "Accepted"
          : null,
        file_url: declaration.evidence_file ? `/uploads/file_declaration/${declaration.evidence_file}` : null,
        status_submittion: getStatusName(declaration?.status_id),
        modalType: getModalType(declaration, userNrp ?? ""),
        details: (declaration.trx_detail_declaration || []).map((detail:any) => ({
          date_activity: detail.date_activity
            ? new Date(detail.date_activity).toLocaleDateString("id-ID", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })
            : null,
          location_activity: detail.location_activity || null,
          hotel_cost: detail.hotel_cost || 0,
          taxi_cost: detail.taxi_cost || 0,
          upd_cost: detail.upd_cost || 0,
          consume_cost: detail.consume_cost || 0,
          ticket_cost: detail.ticket_cost || 0,
          other_cost: detail.other_cost || 0,
          total_cost: detail.total_cost || 0,
          explanation: detail.explanation || "",
        })),
      }));
        const totalItems = await TrxDeclaration.count({
          where: buildWhereClause(),
        });

        const totalPages = Math.ceil(totalItems / pageSize);

        res.status(200).send(
          JSONbig.stringify({
            success: true,
            message: "Successfully retrieved Declaration data",
            data: {
              data: formattedData,
              totalPages,
              currentPage: pageNumber,
              totalItems,
            },
          })
        );
      }catch (err) {
        console.error("Error fetching Declaration:", err);
        res.status(500).json({
          success: false,
          message: "Error retrieving Declaration data",
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


export const handleTrx = async (
  req: Request & { user?: { nrp: string } },
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const { remark, trxType, actionType, down_payment } = req.body;
  const userNrp = req.user?.nrp;

  if (!remark) {
    res.status(400).json({
      success: false,
      message: "Remark must be provided and cannot be empty",
    });
    return;
  }

  const now = getCurrentWIBDate();
  let updateData: any = { updated_at: now };

  try {
    const model = trxModelMap[trxType];
    if (!model) {
      res.status(400).json({ success: false, message: "Invalid transaction type" });
      return;
    }

    const selectFields = getSelect(trxType);
    const trxData = await model.findUnique({
      where: { id: Number(id) },
      select: selectFields,
    });

    if (!trxData) {
      res.status(404).json({ success: false, message: "Transaction not found" });
      return;
    }

    const isAcc = userNrp === trxData.accept_to;
    const isApp = userNrp === trxData.approve_to;
    const isAppDeptHead = userNrp === trxData.accept_to_depthead;
    const isAppDivhead = userNrp === trxData.approve_to_divhead;
    const isAppDicDiv = userNrp === trxData.approve_to_dicdiv;
    const isAppDeptHeadHc = userNrp === trxData.approve_to_depthead_hc;
    const isAppDivHeadHc = userNrp === trxData.approve_to_divhead_hc;
    const isAppDicHc = userNrp === trxData.approve_to_dichc;
    const isAppPresdir = userNrp === trxData.approve_to_presdir;

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

          if (leaveQuota) {
            await TrxLeaveQuota.update({
              where: { id: leaveQuota.id },
              data: {
                leave_balance: { increment: Number(trxDetail.total_leave_days) },
                used_leave: { decrement: Number(trxDetail.total_leave_days) },
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

          if (leaveQuota) {
            await TrxLeaveQuota.update({
              where: { id: leaveQuota.id },
              data: {
                leave_balance: { increment: Number(trxDetail.total_leave_days) },
                used_leave: { decrement: Number(trxDetail.total_leave_days) },
                updated_at: now,
              },
            });
          }
        }
      }
    } else {
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
      } else if (isAppDeptHead) {
        updateData = {
          ...updateData,
          status_id: 8,
          accepted_depthead: userNrp,
          accepted_depthead_remark: remark,
          accepted_depthead_date: now,
        };
      } else if (isAppDivhead) {
        updateData = {
          ...updateData,
          status_id: 9,
          down_payment: down_payment,
          approved_divhead: userNrp,
          approved_divhead_remark: remark,
          approved_divhead_date: now,
        };
      } else if (isAppDicDiv) {
        updateData = {
          ...updateData,
          status_id: 10,
          approved_dicdiv: userNrp,
          approved_dicdiv_remark: remark,
          approved_dicdiv_date: now,
        };
      } else if (isAppDeptHeadHc) {
          updateData = {
            ...updateData,
            status_id: 11,
            approved_depthead_hc: userNrp,
            approved_depthead_hc_remark: remark,
            approved_depthead_hc_date: now,
          };
        } else if (isAppDivHeadHc) {
          updateData = {
            ...updateData,
            status_id: 12,
            approved_divhead_hc: userNrp,
            approved_divhead_hc_remark: remark,
            approved_divhead_hc_date: now,
          };
        } else if (isAppDicHc) {
          updateData = {
            ...updateData,
            status_id: 13,
            approved_dichc: userNrp,
            approved_dichc_remark: remark,
            approved_dichc_date: now,
          };
        } else if (isAppPresdir) {
          updateData = {
            ...updateData,
            status_id: 14,
            approved_presdir: userNrp,
            approved_presdir_remark: remark,
            approved_presdir_date: now,
          };
        }
      else if (isApp) {
        updateData = {
          ...updateData,
          status_id: 3,
          approved: userNrp,
          approved_remark: remark,
          approved_date: now,
        };
      }
    }

    if (actionType === "Approved") {
      if (trxType === "mutation") {
        const trxDetail = await model.findUnique({
          where: { id: Number(id) },
          select: {
            user: true,
            superior_to: true,
            division_to: true,
            department_to: true,
          },
        });

        if (trxDetail?.user && trxDetail.superior_to) {
          await User.update({
            where: { personal_number: trxDetail.user },
            data: {
              superior: trxDetail.superior_to,
              dept: trxDetail.department_to,
              divid: trxDetail.division_to,
              updated_at: now,
            },
          });
        }
      } else if (trxType === "resign") {
        const trxDetail = await model.findUnique({
          where: { id: Number(id) },
          select: { user: true },
        });

        if (trxDetail?.user) {
          await User.update({
            where: { personal_number: trxDetail.user },
            data: {
              is_active: 1,
              updated_at: now,
            },
          });
        }
      }
    }

    const result = await model.update({
      where: { id: Number(id) },
      data: updateData,
    });

    res.status(200).send(
      JSONbig.stringify({
        success: true,
        message: "Transaction updated successfully",
        data: result,
      })
    );
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
        const { leave_type_id, start_date, end_date, leave_reason, } = req.body;
        const file = req.file;
        const typeInt = parseInt(req.body.leave_type_id, 10);

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
            leaves_type_id: typeInt,
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
              leave_type_id: typeInt,
              start_date: new Date(start_date),
              end_date: new Date(end_date),
              flag_leaves: 1,
              total_leave_days: totalLeaveDays,
              leave_reason,
              support_document: file?.filename ?? "",
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
        const approveToValue = userData?.dept_data?.depthead_nrp ?? "";
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
        const dayName = dayNames[indexDay]; 
        console.log("Day Name: ", dayName);
        const shiftGroupData = await ShiftGroup.findFirstDetail({
            where: {
                code: shiftData?.id_shift_group,
                index_day: dayName, 
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
        const { start_date, end_date, type, destination_place, transportation, lodging, work_status, office_activities, symbol_currency, currency, taxi_cost, hotel_cost, rent_cost, upd_cost, fiskal_cost, other_cost, total_cost, activity_agenda, purpose, destination_city } = req.body;
  
        if (!start_date || !end_date || !purpose || !destination_city) {
          res.status(400).json({
            success: false,
            message: "All fields must be provided and cannot be empty",
          });
        }

          const currencyFlag = currency ? "1" : "2";
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, "0");
          const prefix = `TRF${currencyFlag}-${year}${month}`;

          const lastTravel = await TrxOfficialTravel.findFirst({
            where: {
              currency: currency,
            },
            orderBy: {
              created_at: 'desc',
            },
          });

          let newCodeNumber = 1;

          if (lastTravel && lastTravel.code.startsWith(prefix)) {
            const numberPart = lastTravel.code.slice(prefix.length);
            const lastNumber = parseInt(numberPart, 10);
            if (!isNaN(lastNumber)) {
              newCodeNumber = lastNumber + 1;
            }
          }

          const paddedCodeNumber = String(newCodeNumber).padStart(5, "0");
          const code = `${prefix}${paddedCodeNumber}`;


        const userData = await User.findUnique({
          where: { personal_number: userNrp },
          include: {
            dept_data: {
              select: {
                id: true,
                depthead_nrp: true,
                divhead_nrp: true,
              },
            },
            
          },
        });
        const totalTravelDays = differenceInDays(end_date, start_date) + 1;

        const approvalData = {
          accept_to_depthead: userData?.dept_data?.depthead_nrp ?? "",
          approve_to_divhead: userData?.dept_data?.divhead_nrp ?? "",
          approve_to_depthead_hc: "P0120010",
        };

        if (currencyFlag === "1") {
          Object.assign(approvalData, {
            approve_to_dicdiv: "P0120008",
            approve_to_divhead_hc: "P0120014",
            approve_to_dichc: "P0120009",
            approve_to_presdir: "P0120011",
          });
        }

        const newLeave = await TrxOfficialTravel.create({
          data: {
            code,
            user: userNrp,
            status_id: 1,
            start_date: new Date(start_date),
            end_date: new Date(end_date),
            total_leave_days: totalTravelDays,
            type,
            destination_place,
            transportation,
            lodging,
            work_status,
            office_activities,
            purpose,
            symbol_currency,
            currency,
            taxi_cost,
            hotel_cost,
            rent_cost,
            upd_cost,
            fiskal_cost,
            other_cost,
            total_cost,
            destination_city,
            activity_agenda,
            created_by: userId,
            created_at: getCurrentWIBDate(),
            updated_by: userId,
            updated_at: getCurrentWIBDate(),
            ...approvalData,
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
        const { user, superior_to, division_to, department_to, superior_from, division_from, department_from, effective_date, reason } = req.body;
  
      if ( !user || !superior_to || !division_to || !department_to || !superior_from || !division_from || !department_from|| !effective_date || !reason ) {
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
              divhead_nrp: true,
            },
          },
          
        },
      });
    
      const acceptToValue = userData?.dept_data?.divhead_nrp ?? ""
      const approveToValue = "P0120010"
      const newMutation = await TrxMutation.create({
        data: {
          user: user,
          status_id: 1,
          effective_date: new Date(effective_date),
          superior_from: superior_from,
          division_from: division_from,
          superior_to: superior_to,
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
        const file = req.file;

        if (!effective_date || !reason) {
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

        if (!userData) {
          res.status(404).json({
            success: false,
            message: "User data not found",
          });
        }

        const acceptToValue = userData?.superior ?? "";
        const approveToValue = userData?.dept_data?.depthead_nrp ?? "";

        try {
          const newresign = await TrxResign.create({
            data: {
              user: userNrp,
              status_id: 1,
              effective_date: new Date(effective_date),
              reason,
              file_upload: file?.filename ?? "",
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
          message: "Resign added successfully",
          data: { newresign },
        }));

        } catch (error) {
          console.error("Error while inserting resign:", error);
          res.status(500).json({
            success: false,
            message: "Internal server error",
          });
        }
        break;
      }
      case "declaration" : {
  try {
    const {
      code_trx,
      user,
      start_date_actual,
      end_date_actual,
      total_money_change,
      details = "[]"
    } = req.body;

    const file = req.file;
    const parsedDetails = JSON.parse(details);

    if (
      !code_trx?.trim() ||
      !user?.trim() ||
      !start_date_actual ||
      !end_date_actual ||
      !Array.isArray(parsedDetails) ||
      parsedDetails.length === 0
    ) {
      res.status(400).json({
        success: false,
        message: "Missing or invalid required fields",
      });
      return;
    }
          const startDate = new Date(start_date_actual);
          const endDate = new Date(end_date_actual);
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
              res.status(400).json({
                success: false,
                message: "Invalid date format for start_date_actual or end_date_actual",
              });
              return;
          }
          
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, "0");
          const prefix = `DEC-${year}${month}`;
          
            const lastDeclaration = await TrxDeclaration.findFirst({
              where: {
                code: {
                startsWith: prefix,
                  },
                },
                orderBy: {
                created_at: 'desc',
                },
            });
          
          let newCodeNumber = 1;
            if (lastDeclaration) {
              let lastNumber = parseInt(lastDeclaration.code.replace(prefix, ""), 10);
            if (isNaN(lastNumber)) lastNumber = 0;
              newCodeNumber = lastNumber + 1;
            }
          
        const newCode = `${prefix}${newCodeNumber.toString().padStart(5, "0")}`;
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
              const acceptToValue = userData?.dept_data?.depthead_nrp ?? "";
              const approveToValue = "P0120010"
              const newDeclaration = await TrxDeclaration.create({
              data: {
                code: newCode,
                code_trx,
                user,
                start_date_actual: startDate,
                end_date_actual: endDate,
                total_money_change,
                evidence_file: file?.filename ?? "",
                status_id: 1,
                accept_to: acceptToValue,
                approve_to: approveToValue,
                created_by: 90,
                created_at: getCurrentWIBDate(),
                updated_at: getCurrentWIBDate(),
                trx_detail_declaration: {
                  create: parsedDetails.map((item) => ({
                    date_activity: new Date(item.date_activity),
                    location_activity: item.location_activity?.trim() || "",
                    hotel_cost: Number(item.hotel_cost) || 0,
                    taxi_cost: Number(item.taxi_cost) || 0,
                    upd_cost: Number(item.upd_cost) || 0,
                    consume_cost: Number(item.consume_cost) || 0,
                    ticket_cost: Number(item.ticket_cost) || 0,
                    other_cost: Number(item.other_cost) || 0,
                    total_cost: Number(item.total_cost) || 0,
                    explanation: item.explanation?.trim() || "",
                    created_by: 90,
                    created_at: getCurrentWIBDate(),
                    updated_at: getCurrentWIBDate(),
                  })),
                },
              },
            });
                res.status(201).send(JSONbig.stringify({
                success: true,
                message: "Declaration created successfully",
                data: newDeclaration,
              }));
        } catch (err) {
        console.error("Error creating Declaration:", err);
        res.status(500).json({
          success: false,
          message: "Error creating Declaration",
        });
      }
        break;
    }

      default:
        res.status(400).json({ success: false, message: "Invalid type" });

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
    trendData.forEach((item) => {
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
              { accept_to_depthead: userNrp },
              {
                AND: [
                  { approve_to_divhead: userNrp },
                  { accepted_depthead_date: { not: null } },
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
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

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
      //leave
      case "leave": {
        try {
          const validSortFields = ["name", "department", "title", "start_date", "end_date", "status_id", "leave_reason"];
          const sortField = validSortFields.includes(sort as string) ? (sort as string) : "user";

          const dateFilter = month && year ? {
            OR: [
              {
                start_date: {
                  gte: startOfMonth,
                  lt: endOfMonth,
                },
              },
              {
                end_date: {
                  gte: startOfMonth,
                  lt: endOfMonth,
                },
              },
            ],
          }
            : undefined;

          const TrxLeaveData = await TrxLeave.findMany({
            where: {
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
                    { leave_type: { title: { contains: search as string } } },
                  ],
                },
                ...(statusFilter ? [statusFilter] : []),
                ...(dateFilter ? [dateFilter] : []), // tambahkan hanya jika ada
              ],
            },
            include: {
              leave_type: { select: { title: true } },
              user_data: {
                select: {
                  name: true,
                  dept_data: {
                    select: {
                      nama: true,
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

          const mergeTrxLeaveData = TrxLeaveData.map((trx) => {

            return {
              ...trx,
              leave_type_name: trx.leave_type?.title || "Unknown",
              start_date: trx.start_date
                ? new Date(trx.start_date).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })
                : null,
              end_date: trx.end_date
                ? new Date(trx.end_date).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })
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
            };
          });

          const totalItems = await TrxLeave.count({
            where: {
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
                    { leave_type: { title: { contains: search as string } } },
                  ],
                },
                ...(statusFilter ? [statusFilter] : []),
                ...(dateFilter ? [dateFilter] : []), // tambahkan hanya jika ada
              ],
            },
          });

          const totalPages = Math.ceil(totalItems / pageSize);

          res.status(200).send(
            JSONbig.stringify({
              success: true,
              message: "Successfully retrieved leave data",
              data: {
                data: mergeTrxLeaveData,
                totalPages,
                currentPage: pageNumber,
                totalItems,
              },
            })
          );
        } catch (err) {
          console.error("ERROR DI BE (leave):", err);
          res.status(500).json({
            success: false,
            message: "Error retrieving leave data",
          });
        }
        break;
      }

      //overtime
      case "overtime": {
        try {
          const validSortFields = ["name", "department", "check_in_ovt", "check_out_ovt", "note_ovt"];
          const sortField = validSortFields.includes(sort as string) ? (sort as string) : "user";
          const dateFilter = month && year ? {
            OR: [
              {
                check_in_ovt: {
                  gte: startOfMonth,
                  lt: endOfMonth,
                },
              },
              {
                check_out_ovt: {
                  gte: startOfMonth,
                  lt: endOfMonth,
                },
              },
            ],
          }
            : undefined;
          const trxOvertimeData = await TrxOvertime.findMany({
            where: {
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
                ...(dateFilter ? [dateFilter] : []), // tambahkan hanya jika ada
              ],
            },
            include: {
              user_data: {
                select: {
                  name: true,
                  department: true,
                  superior: true,
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

          const mergeTrxOvertimeData = trxOvertimeData.map((trx) => {
            const formatDateTime = (dateString: string | Date | null): string | null => {
              if (!dateString) return null;

              const date = new Date(dateString);
              if (isNaN(date.getTime())) return null; // Validasi tanggal

              return date.toLocaleDateString("en-US", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              }) + ' at ' + date.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              });
            };

            return {
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
            };
          });

          const totalItems = await TrxOvertime.count({
            where: {
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
            },
          });

          const totalPages = Math.ceil(totalItems / pageSize);

          res.status(200).send(JSONbig.stringify({
            success: true,
            message: "Successfully retrieved overtime data",
            data: {
              data: mergeTrxOvertimeData,
              totalPages,
              currentPage: pageNumber,
              totalItems,
            },
          }));
        } catch (err) {
          console.error("ERROR DI BE (overtime):", err);
          res.status(500).json({ success: false, message: "Error retrieving overtime data" });
        }
        break;
      }

      //officialTravel
      case "officialTravel": {
        try {
          const validSortFields = ["name", "departement", "start_date", "end_date", "purpose", "destination_city"];
          const sortField = validSortFields.includes(sort as string) ? (sort as string) : "user";
          const sortOrder = order === "desc" ? "desc" : "asc";
          const dateFilter = month && year ? {
            OR: [
              {
                start_date: {
                  gte: startOfMonth,
                  lt: endOfMonth,
                },
              },
              {
                end_date: {
                  gte: startOfMonth,
                  lt: endOfMonth,
                },
              },
            ],
          }
            : undefined;

          const trxOfficialTravelData = await TrxOfficialTravel.findMany({
            where: {
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
            },
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


          const mergeTrxOfficialTravelData = trxOfficialTravelData.map((trx) => {
            return {
              ...trx,
              user_name: trx.user_data?.name,
              user_departement: trx.user_data?.department,
              start_date: trx?.start_date
                ? new Date(trx.start_date).toLocaleString("id-ID", {
                  day: "2-digit", month: "long", year: "numeric"
                })
                : null,
              end_date: trx?.end_date
                ? new Date(trx.end_date).toLocaleString("id-ID", {
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
            };
          });

          const totalItems = await TrxOfficialTravel.count({
            where: {
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
                ...(dateFilter ? [dateFilter] : []),],
            },
          });

          const totalPages = Math.ceil(totalItems / pageSize);
          res.status(200).send(JSONbig.stringify({
            success: true,
            message: "Successfully retrieved official travel data",
            data: {
              data: mergeTrxOfficialTravelData,
              totalPages,
              currentPage: pageNumber,
              totalItems,
            },
          }));
        } catch (err) {
          res.status(500).json({ success: false, message: "Error retrieving official travel data" });
        }
        break
      }
      case "mutation": {
        try {
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
          }
            : undefined;

          const trxMutationData = await TrxMutation.findMany({
            where: {
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
                ...(dateFilter ? [dateFilter] : []),],
            },
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


          const mergeTrxMutationData = trxMutationData.map((trx) => {
            return {
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
            };
          });
          const totalItems = await TrxMutation.count({
            where: {
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
                ...(dateFilter ? [dateFilter] : []),],
            },
          });

          const totalPages = Math.ceil(totalItems / pageSize);
          res.status(200).send(JSONbig.stringify({
            success: true,
            message: "Successfully retrieved mutation data",
            data: {
              data: mergeTrxMutationData,
              totalPages,
              currentPage: pageNumber,
              totalItems,
            },
          }));
        } catch (err) {
          console.log("errornya :", err)
          res.status(500).json({ success: false, message: "Error retrieving mutation data" });
        }
        break
      }
      case "resign": {
        try {
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
          }
            : undefined;
          const trxResignData = await TrxResign.findMany({
            where: {
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
                ...(dateFilter ? [dateFilter] : []),],
            },
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

          const mergeTrxResignData = trxResignData.map((trx) => {
            return {
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
            };
          });
          const totalItems = await TrxResign.count({
            where: {
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
                ...(dateFilter ? [dateFilter] : []),],
            },
          });

          const totalPages = Math.ceil(totalItems / pageSize);
          res.status(200).send(JSONbig.stringify({
            success: true,
            message: "Successfully retrieved resign data",
            data: {
              data: mergeTrxResignData,
              totalPages,
              currentPage: pageNumber,
              totalItems,
            },
          }));
        } catch (err) {
          console.log("errornya :", err)
          res.status(500).json({ success: false, message: "Error retrieving resign data" });
        }
        break
      }
      default: {
        res.status(400).json({ success: false, message: "Invalid type parameter" });
        break;
      }

    }
  } catch (err) {
    console.error("ERROR UTAMA:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
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

    console.log("nrp", userNrp);
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
              MsLeaveType: {
                is: {
                  id: trxDetail.leave_type_id,
                },
              },
            },
          });

          if (leaveQuota) {
            await TrxLeaveQuota.update({
              where: { id: leaveQuota.id },
              data: {
                leave_balance: {
                  increment: Number(trxDetail.total_leave_days),
                },
                updated_at: now,
              },
            });
          } else {
            console.warn(`Leave quota not found for user ${trxDetail.user} and leave_type_id ${trxDetail.leave_type_id}`);
          }
        } else {
          console.warn("Incomplete transaction detail for quota refund.");
        }
      }
    }

    else {
      if (!isAcc && !isApp) {
        console.log("")
        res.status(403).json({
          success: false,
          message: "You are not authorized to perform this action.",
        });
      }

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


export const createSubmittion = async (req: Request & { user?: { nrp: string, id: number } }, res: Response): Promise<void> => {
  try {
    const {
      type = "",
    } = req.query;
    const userNrp = req.user?.nrp ?? "";
    const userId = req.user?.id ?? 0;

    switch (type) {
      case "leave": {
        const { leave_type_id, start_date, end_date, flag_leaves, leave_reason } = req.body;

        if (!leave_type_id || !start_date || !end_date || !flag_leaves || !leave_reason) {
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
        console.log("nrp", userNrp)
        // Ambil data kuota cuti aktif user
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
              flag_leaves,
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
        const { shift, check_in_ovt, check_out_ovt, note_ovt } = req.body;
        if (!shift || !check_in_ovt || !check_out_ovt || !note_ovt) {
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
        const deptValue = userData?.dept ?? 0;
        const newOvertime = await TrxOvertime.create({
          data: {
            user: userNrp,
            dept: deptValue,
            shift: Number(shift),
            status_id: 1,
            check_in_ovt: check_in_ovt,
            check_out_ovt: check_out_ovt,
            note_ovt: note_ovt,
            accept_to: acceptToValue,
            approve_to: approveToValue,
            created_by: userId,
            created_at: getCurrentWIBDate(),
            updated_at: getCurrentWIBDate(),
          },
        });
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
            start_date,
            end_date,
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
        const { user, effective_date, reason } = req.body;

        if (!user || !effective_date || !reason) {
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
            user,
            status_id: 1,
            effective_date,
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
        if (!effective_date || !reason) {
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
            effective_date,
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
      message: "Error creating leave request",
      error: error instanceof Error ? error.message : error,
    });
  }
};