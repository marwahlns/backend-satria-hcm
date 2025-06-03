  import ExcelJS from "exceljs";
  import { MsDepartment } from "../models/Table/Satria/MsDepartment";
  import { MsDivision } from "../models/Table/Satria/MsDivision";


    export const getModalType = (trx: any, userNrp: string): "action" | "detail" => {
    const statusId = Number(trx.status_id);

    if (
      (trx.accept_to_depthead === userNrp && trx.accepted_depthead) ||
      (trx.approve_to_divhead === userNrp && trx.approved_divhead) ||
      (trx.approve_to_dicdiv === userNrp && trx.approved_dicdiv) ||
      (trx.approve_to_depthead_hc === userNrp && trx.approved_depthead_hc) ||
      (trx.approve_to_divhead_hc === userNrp && trx.approved_divhead_hc) ||
      (trx.approve_to_dichc === userNrp && trx.approved_dichc) ||
      (trx.approve_to_presdir === userNrp && trx.approved_presdir)
    ) {
      return "detail";
    }

    if (statusId === 1 && trx.accept_to === userNrp) {
      return "action";
    }

    if (
      (trx.accept_to_depthead === userNrp && !trx.accepted_depthead) ||
      (trx.approve_to_divhead === userNrp && !trx.approved_divhead) ||
      (trx.approve_to_dicdiv === userNrp && !trx.approved_dicdiv) ||
      (trx.approve_to_depthead_hc === userNrp && !trx.approved_depthead_hc) ||
      (trx.approve_to_divhead_hc === userNrp && !trx.approved_divhead_hc) ||
      (trx.approve_to_dichc === userNrp && !trx.approved_dichc) ||
      (trx.approve_to_presdir === userNrp && !trx.approved_presdir)
    ) {
      return "action";
    }

    if (trx.approve_to === userNrp && statusId === 2) {
      return "action";
    }

    return "detail";
  };




    export const getStatusName = (statusId: bigint): string => {
      const id = Number(statusId);
    
      switch (id) {
        case 1:
          return "Opened";
        case 2:
          return "Partial Approved";
        case 3:
          return "Fully Approved";
        case 6:
          return "Rejected";
        case 7:
          return "Canceled";
        case 8:
          return "Accepted by Dept.Head";
        case 9:
          return "Approved by Div.Head";
        case 10:
          return "Approved by DIC Division";
        case 11:
          return "Approved by Dept.Head HC";
        case 12:
          return "Approved by Div.Head HC";
        case 13:
          return "Appproved by DIC HC";
        case 14:
          return "Accepted by President director";
        default:
          return "Unknown";
      }
    };
    

  export const generateExcelResponse = async (
    res: any,
    worksheet: ExcelJS.Worksheet,
    data: any[],
  ) => {

    const firstRow = worksheet.getRow(1);
    const firstCell = firstRow.getCell(1);
    const lastCell = firstRow.getCell(worksheet.columnCount);

    if (firstCell && lastCell) {
      worksheet.autoFilter = {
        from: {
          row: 1,
          column: 1
        },
        to: {
          row: 1,
          column: worksheet.columnCount
        }
      };
    }

    firstRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F81BD' }
      };
      cell.font = {
        color: { argb: 'FFFFFFFF' },
        bold: true
      };
      cell.alignment = { horizontal: 'center' };
    });
    firstRow.commit();

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    // Tulis workbook ke response
    const workbook = worksheet.workbook;
    await workbook.xlsx.write(res);
    res.end();
  };

  export async function isUserDeptHead(userNrp: string): Promise<boolean> {
    if (!userNrp) return false;

    const dept = await MsDepartment.findFirst({
      where: {
        depthead_nrp: userNrp,
      },
    });

    return !!dept;
  }

  export async function isUserDivHead(userNrp: string): Promise<boolean> {
    if (!userNrp) return false;

    const dept = await MsDivision.findFirst({
      where: {
        divhead_nrp: userNrp,
      },
    });

    return !!dept;
  }

  export const formatRupiah = (num: any): string => {
    if (num == null) return "";
    const str = num.toString();
    return "Rp " + str.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };


  export const getSelect = (trxType: string) => {
    return trxType === "officialTravel"
      ? {
          accept_to_depthead: true,
          approve_to_divhead: true,
          approve_to_dicdiv: true,
          approve_to_depthead_hc: true,
          approve_to_divhead_hc: true,
          approve_to_dichc: true,
          approve_to_presdir: true,
          approved_divhead: true,
          approved_dicdiv: true,
          approved_depthead_hc: true,
          approved_divhead_hc: true,
          approved_dichc: true,
          approved_presdir: true,
          status_id: true,
        }
      : {
          accept_to: true,
          approve_to: true,
          status_id: true,
        };
  };
