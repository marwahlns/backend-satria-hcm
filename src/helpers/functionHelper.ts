import ExcelJS from "exceljs";


export const getModalType = (trx: any, userNrp: string): "action" | "detail" => {
    const statusId = Number(trx.status_id);
    const isAcceptToAndPending = statusId === 1 && trx.accept_to === userNrp;
    const isApproveTo = trx.approve_to === userNrp;
  
    if (isAcceptToAndPending) {
      return "action";
    }
  
    if (isApproveTo) {
      if (statusId === 2) {
        return "action";
      }
      if (statusId === 6) {
        return "detail";
      }
    }
  
    return "detail";
  };
  

  export const getStatusName = (statusId: bigint): string => {
    const id = Number(statusId); // konversi bigint ke number
  
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

  // Styling header
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

  // Set response header untuk file Excel
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  // Tulis workbook ke response
  const workbook = worksheet.workbook;
  await workbook.xlsx.write(res);
  res.end();
};



