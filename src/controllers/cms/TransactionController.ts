import JSONbig from "json-bigint";
import { Request, Response } from "express";
import { TrxLeave } from "../../models/Table/Satria/TrxLeave";
import { TrxOvertime } from "../../models/Table/Satria/TrxOvertime";
import { TrxOfficialTravel } from "../../models/Table/Satria/TrxOfficialTravel";
import { TrxMutation } from "../../models/Table/Satria/TrxMutation";
import { TrxResign } from "../../models/Table/Satria/TrxResign";
import { TrxLeaveQuota } from "../../models/Table/Satria/TrxLeaveQuota";
import { getCurrentWIBDate } from "../../helpers/timeHelper";
import { getStatusName, getModalType, generateExcelResponse, isUserDeptHead, isUserDivHead, getSelect, formatRupiah, generatePdfOfficialTravel, generatePdfDeclaration, generatePdfResign, generatePdfMutation } from "../../helpers/functionHelper";
import { User } from "../../models/Table/Satria/MsUser";
import { differenceInDays, parse } from "date-fns";
import ExcelJS from "exceljs";
import { TrxShiftEmployee } from "../../models/Table/Satria/TrxShiftEmployee";
import { ShiftGroup } from "../../models/Table/Satria/MsShiftGroup";
import { Shift } from "../../models/Table/Satria/MsShift";
import { Attendance } from "../../models/Table/Satria/TrxAttendance";
import { TrxDeclaration } from "../../models/Table/Satria/TrxDeclaration";
import { MsDepartment } from "../../models/Table/Satria/MsDepartment";
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

  const day = date.getDate();
  const month = date.toLocaleString("en-US", { month: "short" });
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day} ${month} ${year} at ${hours}:${minutes}`;
}


function formatDateToEnglish(dateString: string | Date | null): string | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;

  const day = date.getDate().toString().padStart(2, "0");
  const month = date.toLocaleString("en-US", { month: "short" });
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}

export const formatDateIndo = (dateStr: string | Date): string => {
  const date = new Date(dateStr);
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
};


export const getAllTrxData = async (req: Request & { user?: { nrp: string, dept_head: number } }, res: Response): Promise<void> => {
  try {
    const {
      type = "",
      page = "1",
      limit = "10",
      search = "",
      sort = "user",
      order = "desc",
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
    const sortOrder = order === "asc" ? "asc" : "desc";
    const parsedStatus = parseInt(status as string, 10);
    const statusFilter = parsedStatus > 0 ? { status_id: parsedStatus } : undefined;
    const startOfMonth = new Date(`${year}-${month}-01`);
    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    switch (type) {
      case "leave": {
        try {
          const isAdmin = userNrp === "P0120001";
          const validSortFields = ["user_name", "user_departement", "leave_type_name", "total_leave_days"];
          const sortField = validSortFields.includes(sort as string) ? (sort as string) : "id";

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
              orderBy: (() => {
                switch (sortField) {
                  case "user_name":
                    return { user_data: { name: sortOrder } };
                  case "user_departement":
                    return { user_data: { dept_data: { nama: sortOrder } } };
                  case "leave_type_name":
                    return { leave_type: { title: sortOrder } };
                  default:
                    return { [sortField]: sortOrder };
                }
              })(),
              ...(exportQuery ? {} : { skip, take: pageSize }),
            });

            return TrxLeaveData.map((trx) => ({
              ...trx,
              leave_type_name: trx.leave_type?.title || "Unknown",
              start_date: formatDateToEnglish(trx.start_date) ?? "-",
              end_date: formatDateToEnglish(trx.end_date) ?? "-",
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
          const validSortFields = ["user_name", "user_departement"];
          const sortField = validSortFields.includes(sort as string) ? (sort as string) : "id";

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
              orderBy: (() => {
                switch (sortField) {
                  case "user_name":
                    return { user_data: { name: sortOrder } };
                  case "user_departement":
                    return { user_data: { dept_data: { nama: sortOrder } } };
                  default:
                    return { [sortField]: sortOrder };
                }
              })(),
              ...(exportQuery ? {} : { skip, take: pageSize }),
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

          const validSortFields = ["user_name", "user_departement", "destination_city1", "destination_place1", "total_leave_days"];
          const sortField = validSortFields.includes(sort as string) ? (sort as string) : "id";

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
              { destination_place1: { contains: search as string } },
              { destination_place2: { contains: search as string } },
              { destination_place3: { contains: search as string } },
              { destination_city1: { contains: search as string } },
              { destination_city2: { contains: search as string } },
              { destination_city3: { contains: search as string } },
              ...(Number(search) ? [{ id: Number(search) }] : []),
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
                      {
                        AND: [
                          { code: { startsWith: "TRF2" } },
                          { approved_divhead: { not: null } },
                        ],
                      },
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
              ...(isPresdir ? [{ approved_dichc: { not: null } }] : []),
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
              orderBy: (() => {
                switch (sortField) {
                  case "user_name":
                    return { user_data: { name: sortOrder } };
                  case "user_departement":
                    return { user_data: { dept_data: { nama: sortOrder } } };
                  default:
                    return { [sortField]: sortOrder };
                }
              })(),
              ...(exportQuery ? {} : { skip, take: pageSize }),
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

            const users = await User.findMany();
            const nrpNameMap: Record<string, string> = {};

            users.forEach((u) => {
              if (u.personal_number) {
                nrpNameMap[u.personal_number] = u.name;
              }
            });

            const declarationTrxSet = new Set(declarationTrx.map((d: any) => d.code_trx));
            return trxOfficialTravelData.map((trx) => ({
              ...trx,
              code_trx: trx.code,
              user_nrp: trx.user,
              user_name: trx.user_data?.name,
              user_departement: trx.user_data?.department,
              user_division: trx.user_data?.division,
              user_position: trx.user_data?.title,
              worklocation_name: trx.user_data?.worklocation_name,
              down_payment: trx.down_payment
                ? formatRupiah(trx.down_payment)
                : null,
              start_date: formatDateToEnglish(trx?.start_date),
              end_date: formatDateToEnglish(trx?.end_date),
              depthead_name: nrpNameMap[trx.accept_to_depthead],
              divhead_name: nrpNameMap[trx.approve_to_divhead],
              dicdiv_name: nrpNameMap[trx.approve_to_dicdiv ?? ""],
              status_submittion: getStatusName(trx?.status_id),
              actionType:
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
              isDomestic: trx.code?.startsWith("TRF2") || false,

            }));
          };

          if (exportQuery === "true") {
            const data = await getOfficialTravelData();

            const formattedData = data.map((trx, index) => ({
              no: index + 1,
              code: trx.code_trx,
              nrp: trx.user_nrp ?? "-",
              name: trx.user_name ?? "-",
              department: trx.user_departement ?? "-",
              destinationCity1: trx.destination_city1,
              destinationCity2: trx.destination_city2,
              destinationCity3: trx.destination_city3,
              destinationPlace1: trx.destination_place1,
              destinationPlace2: trx.destination_place2,
              destinationPlace3: trx.destination_place3,
              type: trx.type ?? "-",
              transportation: trx.transportation ?? "-",
              lodging: trx.lodging ?? "-",
              workStatus: trx.work_status ?? "-",
              officeActivities: trx.office_activities ?? "-",
              agendaActivities: trx.activity_agenda ?? "-",
              purpose: trx.purpose ?? "-",
              startDate: trx.start_date ?? "-",
              endDate: trx.end_date ?? "-",
              totalDays: trx.total_leave_days ?? "-",
              symbolCurrency: trx.symbol_currency ?? "-",
              currency: trx.currency ?? "-",
              taxiCost: trx.taxi_cost ?? "-",
              rentCost: trx.rent_cost ?? "-",
              hotelCost: trx.hotel_cost ?? "-",
              updCost: trx.upd_cost ?? "-",
              fiskalCost: trx.fiskal_cost ?? "-",
              otherCost: trx.other_cost ?? "-",
              totalCost: trx.total_cost ?? "-",
              deptheadName: trx.depthead_name ?? "-",
              divheadName: trx.divhead_name ?? "-",
              dicdivName: trx.dicdiv_name ?? "-",
              status: trx.status_id ?? "-",
            }));

            formattedData.sort((a, b) => a.name.localeCompare(b.name));
            generatePdfOfficialTravel(res, formattedData);
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
          const validSortFields = ["user_name", "dept_from", "dept_to"];
          const sortField = validSortFields.includes(sort as string) ? (sort as string) : "id";

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
            if (isDeptHead && userNrp) {
              andConditions.push({
                OR: [
                  {
                    AND: [
                      { approve_to: userNrp },
                      { accepted_date: { not: null } },
                    ],
                  },
                  { created_by: userNrp },
                ],
              });
            }
            if (search) {
              andConditions.push({
                OR: [
                  { user_data: { name: { contains: search as string } } },
                  { user_data: { department: { contains: search as string } } },
                  ...(Number(search) ? [{ id: Number(search) }] : []),
                ],
              });
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
              orderBy: (() => {
                switch (sortField) {
                  case "user_name":
                    return { user_data: { name: sortOrder } };
                  case "dept_from":
                  case "dept_to":
                    return { user_data: { dept_data: { nama: sortOrder } } };
                  default:
                    return { [sortField]: sortOrder };
                }
              })(),
              ...(exportQuery ? {} : { skip, take: pageSize }),
            });

            const userList = await User.findMany();
            const userNrpMap = Object.fromEntries(
              userList.map((user: any) => [user.personal_number, user])
            );
            const deptList = await MsDepartment.findMany();
            const deptIdMap = Object.fromEntries(
              deptList.map((dept: any) => [dept.id, dept])
            );
            const deptDivCodeMap = Object.fromEntries(
              deptList.map((dept: any) => [dept.div_code, dept])
            );
            return trxMutationData.map((trx) => ({
              ...trx,
              user_name: trx.user_data?.name,
              user_departement: trx.user_data?.department,
              division_from: deptDivCodeMap[trx.division_from]?.div_name ?? "-",
              dept_from: deptIdMap[trx.dept_from]?.nama ?? "-",
              superior_from: userNrpMap[trx.superior_from]?.name ?? "-",
              division_to: deptDivCodeMap[trx.division_to]?.div_name ?? "-",
              dept_to: deptIdMap[trx.dept_to]?.nama ?? "-",
              superior_to: userNrpMap[trx.superior_to]?.name ?? "-",
              effective_date: formatDateToEnglish(trx?.effective_date),
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


          const data = await getMutationData();
          const formattedData = data.map((trx, index) => ({
            no: index + 1,
            name: trx.user_name ?? "-",
            divisionFrom: trx.division_from ?? "-",
            deptFrom: trx.dept_from ?? "-",
            divisionTo: trx.division_to ?? "-",
            deptTo: trx.dept_to ?? "-",
            superiorFrom: trx.superior_from ?? "-",
            superiorTo: trx.superior_to ?? "-",
            effectiveDate: trx.effective_date ?? "-",
            reason: trx.reason ?? "-",
            status: trx.status_submittion ?? "-",
            statusPdf: trx.status_id ?? "-",
          }));

          if (exportQuery === "true") {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Mutation Report");

            worksheet.columns = [
              { header: "No", key: "no", width: 5 },
              { header: "Name", key: "name", width: 45 },
              { header: "From Division", key: "divisionFrom", width: 45 },
              { header: "From Department", key: "deptFrom", width: 45 },
              { header: "To Division", key: "divisionTo", width: 45 },
              { header: "To Department", key: "deptTo", width: 45 },
              { header: "Effective Date", key: "effectiveDate", width: 20 },
              { header: "Reason", key: "reason", width: 40 },
              { header: "Status", key: "status", width: 20 },
            ];

            worksheet.addRows(formattedData);
            worksheet.autoFilter = { from: "A1", to: "F1" };

            await generateExcelResponse(res, worksheet, data);

          } else if (exportQuery === "pdf") {
            const pdfData = formattedData.map(({ no, name, divisionFrom, deptFrom, divisionTo, deptTo, superiorTo, superiorFrom, effectiveDate, reason, statusPdf }) => ({
              no,
              name,
              divisionFrom,
              deptFrom,
              divisionTo,
              superiorTo,
              superiorFrom,
              deptTo,
              effectiveDate,
              reason,
              statusPdf,
            }));
            generatePdfMutation(res, pdfData);
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
          console.log("error mutasi", err)
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
          const validSortFields = ["user_name", "user_departement", "effective_date", "reason"];
          const sortField = validSortFields.includes(sort as string) ? (sort as string) : "id";

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
                  { approve_to: userNrp },
                  { user: userNrp },
                ],
              },
              {
                OR: [
                  { user_data: { name: { contains: search as string } } },
                  { user_data: { department: { contains: search as string } } },
                  ...(Number(search) ? [{ id: Number(search) }] : []),
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
                    title: true,
                  },
                },
              },
              orderBy: (() => {
                switch (sortField) {
                  case "user_name":
                    return { user_data: { name: sortOrder } };
                  case "user_departement":
                    return { user_data: { dept_data: { nama: sortOrder } } };
                  default:
                    return { [sortField]: sortOrder };
                }
              })(),
              ...(exportQuery ? {} : { skip, take: pageSize }),
            });

            const users = await User.findMany();
            const nrpNameMap: Record<string, string> = {};
            users.forEach((u) => {
              if (u.personal_number) {
                nrpNameMap[u.personal_number] = u.name;
              }
            });
            return trxResignData.map((trx) => ({
              ...trx,
              user_name: trx.user_data?.name,
              user_departement: trx.user_data?.department,
              user_posisition: trx.user_data?.title,
              effective_date: formatDateToEnglish(trx.effective_date),
              effective_date_export: formatDateIndo(trx.effective_date),
              status_submittion: getStatusName(trx?.status_id),
              actionType:
                ((trx.accept_to === userNrp && trx.approve_to === userNrp) || trx.approve_to === userNrp)
                  ? "Approved"
                  : trx.accept_to === userNrp
                    ? "Accepted"
                    : null,
              modalType: getModalType(trx, userNrp ?? ""),
              depthead_name: nrpNameMap[trx.accept_to],
              // file_url: trx.file_upload ? `/uploads/file_resign/${trx.file_upload}` : null,

            }));
          };

          if (exportQuery === "true") {
            const data = await getResignData();
            const formattedData = data.map((trx, index) => ({
              name: trx.user_name ?? "-",
              department: trx.user_departement ?? "-",
              userPosition: trx.user_posisition ?? "-",
              effectiveDate: trx.effective_date_export ?? "-",
              deptheadName: trx.depthead_name ?? "-",
              reason: trx.reason ?? "-",
              status: trx.status_id ?? "-",
            }));

            await generatePdfResign(res, formattedData);
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
          const validSortFields = ["code", "user_name", "user_department", "code_trx", "down_payment"];
          const sortField = validSortFields.includes(sort as string) ? (sort as string) : "id";
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
                  { code: { contains: search as string } },
                  // ...(Number(search) ? [{ total_cost_detail: Number(search) }] : []),
                  // ...(Number(search) ? [{ down_payment: Number(search) }] : []),
                ],
              },
              ...(statusFilter ? [statusFilter] : []),
            ],
          });
          const getDeclarationData = async () => {
            const TrxDeclarationData = await TrxDeclaration.findMany({
              where: buildWhereClause(),
              include: {
                officialTravel_data: {
                  include: {
                    user_data: {
                      include: {
                        dept_data: true,
                      },
                    },
                  },
                },
                trx_detail_declaration: true,
              },
              orderBy: (() => {
                switch (sortField) {
                  case "user_name":
                    return { officialTravel_data: { user_data: { name: sortOrder } } };
                  case "user_department":
                    return { officialTravel_data: { user_data: { dept_data: { nama: sortOrder } } } };
                  default:
                    return { [sortField]: sortOrder };
                }
              })(),
              ...(exportQuery ? {} : { skip, take: pageSize }),
            });


            const users = await User.findMany();
            const nrpNameMap: Record<string, string> = {};
            users.forEach((u) => {
              if (u.personal_number) {
                nrpNameMap[u.personal_number] = u.name;
              }
            });
            return TrxDeclarationData.map((declaration) => ({
              ...declaration,
              no_st: declaration.officialTravel_data?.code || null,
              user_name: declaration.officialTravel_data?.user_data?.name || null,
              user_department: declaration.officialTravel_data?.user_data?.department || null,
              user_division: declaration.officialTravel_data?.user_data?.division || null,
              user_position: declaration.officialTravel_data?.user_data?.title || null,
              total_cost: declaration.officialTravel_data?.total_cost || null,
              currency: declaration.officialTravel_data?.currency || null,
              symbol_currency: declaration.officialTravel_data?.symbol_currency || null,
              lodging: declaration.officialTravel_data?.lodging || null,
              destination_place1: declaration.officialTravel_data?.destination_place1 || null,
              destination_place2: declaration.officialTravel_data?.destination_place2 || null,
              destination_place3: declaration.officialTravel_data?.destination_place3 || null,
              worklocation_name: declaration.officialTravel_data?.user_data?.worklocation_name || null,
              work_status: declaration.officialTravel_data?.work_status || null,
              st_type: declaration.officialTravel_data?.type || null,
              down_payment: declaration.officialTravel_data?.down_payment
                ? formatRupiah(declaration.officialTravel_data.down_payment)
                : null,
              downpaymentExport: declaration.officialTravel_data?.down_payment,
              total_money_change: declaration.total_money_change
                ? formatRupiah(declaration.total_money_change)
                : null,
              total_detail_cost: declaration.total_detail_cost
                ? formatRupiah(declaration.total_detail_cost)
                : null,
              start_date: formatDateToEnglish(declaration.officialTravel_data?.start_date),
              end_date: formatDateToEnglish(declaration.officialTravel_data?.end_date),
              start_date_actual: formatDateToEnglish(declaration.start_date_actual),
              end_date_actual: formatDateToEnglish(declaration.end_date_actual),
              depthead_name: nrpNameMap[declaration.accept_to],
              actionType:
                ((declaration.accept_to === userNrp && declaration.approve_to === userNrp) ||
                  declaration.approve_to === userNrp)
                  ? "Approved"
                  : declaration.accept_to === userNrp
                    ? "Accepted"
                    : null,
              file_url: declaration.evidence_file
                ? `/uploads/file_declaration/${declaration.evidence_file}`
                : null,
              status_submittion: getStatusName(declaration?.status_id),
              modalType: getModalType(declaration, userNrp ?? ""),
              details: (declaration.trx_detail_declaration || []).map((detail: any) => ({
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
          };

          if (exportQuery === "true") {
            const data = await getDeclarationData();
            const formattedData = data.map((trx, index) => ({
              nomorOt: trx.no_st ?? "-",
              nrp: trx.user ?? "-",
              name: trx.user_name ?? "-",
              position: trx.user_position ?? "-",
              department: trx.user_department ?? "-",
              division: trx.user_division ?? "-",
              costAllocation: trx.total_cost ?? "-",
              travelFrom: trx.worklocation_name ?? "-",
              travelTo1: trx.destination_place1 ?? "-",
              travelTo2: trx.destination_place2 ?? "-",
              travelTo3: trx.destination_place3 ?? "-",
              stType: trx.st_type ?? "-",
              startDate: trx.start_date ?? "-",
              startDateActual: trx.start_date_actual ?? "-",
              endDate: trx.end_date ?? "-",
              endDateActual: trx.end_date_actual ?? "-",
              workStatus: trx.work_status ?? "-",
              downPayment: trx.downpaymentExport ?? "-",
              currencySymbol: trx.symbol_currency ?? "-",
              currency: trx.currency ?? "-",
              deptheadName: trx.depthead_name ?? "-",
              status: trx.status_id ?? "-",
              details: trx.details ?? [],
            }));
            generatePdfDeclaration(res, formattedData);
          } else {
            const data = await getDeclarationData();
            const totalItems = await TrxDeclaration.count({
              where: buildWhereClause(),
            });

            const totalPages = Math.ceil(totalItems / pageSize);

            res.status(200).send(
              JSONbig.stringify({
                success: true,
                message: "Successfully retrieved Declaration data",
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
            dept_to: true,
          },
        });

        if (trxDetail?.user && trxDetail.superior_to) {
          const department = await MsDepartment.findUnique({
            where: { id: Number(trxDetail.dept_to) },
          });

          const division = await MsDivision.findUnique({
            where: { divid: trxDetail.division_to },
          });

          await User.update({
            where: { personal_number: trxDetail.user },
            data: {
              superior: trxDetail.superior_to,
              dept: Number(trxDetail.dept_to),
              divid: trxDetail.division_to,
              department: department?.nama || "",
              division: division?.nama || "",
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


export const createSubmittion = async (req: Request & { user?: { nrp: string, id: number } }, res: Response): Promise<void> => {
  try {
    const {
      type = "",
    } = req.query;
    const userNrp = req.user?.nrp ?? "";
    const userId = req.user?.id ?? 0;

    switch (type) {
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
          res.status(200).json({
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
          res.status(200).json({
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

        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const dayName = dayNames[indexDay];
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
        const { start_date, end_date, type, destination_place1, destination_place2, destination_place3, transportation, lodging, work_status, office_activities, symbol_currency, currency, taxi_cost, hotel_cost, rent_cost, upd_cost, fiskal_cost, other_cost, total_cost, activity_agenda, purpose, destination_city1, destination_city2, destination_city3 } = req.body;

        if (!start_date || !end_date || !purpose || !destination_place1 || !destination_city1) {
          res.status(200).json({
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
            code: {
              startsWith: prefix,
            },
          },
          orderBy: {
            created_at: 'desc',
          },
        });

        let newCodeNumber = 1;

        if (lastTravel) {
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
        function sanitizeDateString(input: string): string {
          return input
            .replace(/\bSept\b/i, "Sep") // koreksi bentuk tidak standar
            .replace(/\s+/g, " ")        // hapus spasi berlebihan
            .trim();
        }
        const start = parse(sanitizeDateString(start_date), "dd MMM yyyy", new Date());
        const end = parse(sanitizeDateString(end_date), "dd MMM yyyy", new Date());

        const totalTravelDays = differenceInDays(end, start) + 1;
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
            status_id: 1,
            start_date: new Date(start_date),
            end_date: new Date(end_date),
            total_leave_days: totalTravelDays,
            type,
            destination_place1,
            destination_place2,
            destination_place3,
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
            destination_city1,
            destination_city2,
            destination_city3,
            activity_agenda,
            created_by: userId,
            created_at: getCurrentWIBDate(),
            updated_by: userId,
            updated_at: getCurrentWIBDate(),
            ...approvalData,
            user_data: {
              connect: {
                personal_number: userNrp,
              },
            },
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

        if (!user || !superior_to || !division_to || !department_to || !superior_from || !division_from || !department_from || !effective_date || !reason) {
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
            created_by: userNrp,
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

        const acceptToValue = userData?.dept_data?.depthead_nrp ?? "";
        const approveToValue = "P0120001"

        try {
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
      case "declaration": {
        try {
          const {
            code_trx,
            user,
            start_date_actual,
            end_date_actual,
            total_money_change,
            total_detail_cost,
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
              total_detail_cost,
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
    trendData.forEach((item: any) => {
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
    const isAdmin = userNrp === "P0120001";
    const isDeptHead = await isUserDeptHead(userNrp ?? "");
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
            ...(isAdmin
              ? {}
              : {
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
              }),
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
            ...(isAdmin
              ? {}
              : {
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
              }),
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
            ...(isAdmin
              ? {}
              : {
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
              }),
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
            ...(isAdmin
              ? {}
              : isDeptHead && userNrp
                ? {
                  OR: [
                    {
                      AND: [
                        { approve_to: userNrp },
                        { accepted_date: { not: null } },
                      ],
                    },
                    { created_by: userNrp },
                    { accept_to: userNrp },
                    { user: userNrp },
                  ],
                }
                : {
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
                }),
          },
          select: {
            effective_date: true,
          },
        });

        transactions = mutation.map((item) => ({
          start_date: item.effective_date,
        }));
        break;


      case 'resign':
        const resign = await TrxResign.findMany({
          where: {
            effective_date: {
              gte: startOfYear,
              lte: endOfYear,
            },
            ...(isAdmin
              ? {}
              : {
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
              }),
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

    res.status(200).json({
      success: true,
      message: "Successfully get trend submission",
      data: {
        type,
        data: monthlyCounts
      }
    });
  } catch (error) {
    console.error('[getAllSubmission]', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};