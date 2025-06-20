  import ExcelJS from "exceljs";
  import { MsDepartment } from "../models/Table/Satria/MsDepartment";
  import { MsDivision } from "../models/Table/Satria/MsDivision";
  import PDFDocument from 'pdfkit';

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

  export const parseRupiah = (value: string | number): number => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    return parseInt(value.replace(/[^0-9]/g, ""), 10) || 0;
  };

  export function formatIdr(value: string | number | bigint, decimal = 3): string {
    let numericValue: number;

    // Bersihkan input string
    if (typeof value === "string") {
      const cleaned = value.replace(/[^0-9.,-]/g, "").replace(",", ".");
      numericValue = parseFloat(cleaned);
    } else {
      numericValue = Number(value);
    }

    if (isNaN(numericValue)) numericValue = 0;

    const formatted = new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: decimal,
      maximumFractionDigits: decimal,
    }).format(numericValue);

    return `IDR ${formatted}`;
  }

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

 export const shouldShowSignature = (
  position: string,
  trx: { status: number | bigint; code: string }
): boolean => {
  const status = Number(trx.status);
  const code = trx.code;

  if (position === 'Employee') {
    return status !== 7;
  }

  if ([1, 7].includes(status)) return false;

  // Special TRF1 case
  if (code?.startsWith('TRF1') && status === 9) {
    return ['Dept Head / Project Manager', 'Division Head', 'CHCAS Dept Head'].includes(position);
  }

  const statusMap: Record<number, string[]> = {
    8: ['Dept Head / Project Manager'],
    9: ['Dept Head / Project Manager', 'Division Head'],
    10: ['Dept Head / Project Manager', 'Division Head', 'Director In Charge (DIC)'],
    11: ['Dept Head / Project Manager', 'Division Head', 'Director In Charge (DIC)', 'CHCAS Dept Head'],
    12: ['Dept Head / Project Manager', 'Division Head', 'Director In Charge (DIC)', 'CHCAS Dept Head', 'CHCS Division Head'],
    13: ['Dept Head / Project Manager', 'Division Head', 'Director In Charge (DIC)', 'CHCAS Dept Head', 'CHCS Division Head', 'DIC of Human Capital'],
    14: ['Dept Head / Project Manager', 'Division Head', 'Director In Charge (DIC)', 'CHCAS Dept Head', 'CHCS Division Head', 'DIC of Human Capital', 'President Director'],
  };

  return statusMap[status]?.includes(position) || false;
};

export const shouldShowSignatureDeclaration = (
  title: string,
  trx: { status: number }
): boolean => {
  const status = Number(trx.status);

  if (title === 'Acting Officer') {
    return status !== 7;
  }

  if ([1, 7].includes(status)) return false;

  const statusMap: Record<number, string[]> = {
    2: ['Acknowledged By'],
    3: ['Acknowledged By', 'Approved By'],
  };

  return statusMap[status]?.includes(title) || false;
};

export const shouldShowSignatureResign = (
  title: string,
  trx: { status: number }
): boolean => {
  const status = Number(trx.status);

  if (title === 'Hormat Saya') {
    return status !== 7;
  }

  if ([1, 7].includes(status)) return false;

  const statusMap: Record<number, string[]> = {
    2: ['Atasan Langsung'],
    3: ['Atasan Langsung'],
  };

  return statusMap[status]?.includes(title) || false;
};



export const generatePdfOfficialTravel = (res: any, data: any[]) => {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="travel-report.pdf"');
  doc.pipe(res);

  const startX = 30;
  let startY = 20;
  const lineHeight = 16;

  const drawCell = (
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  options = {},
  isHeader = false,
  drawBorder = true
) => {
  if (isHeader) {
    doc.rect(x, y, width, height).fillAndStroke('#e0e0e0', 'black');
  } else if (drawBorder) {
    doc.rect(x, y, width, height).stroke();
  }

  doc.fillColor('black').text(text, x + 5, y + 5, {
    width: width - 10,
    height: height - 10,
    ...options
  });
};


  const trx = data[0];
  const logoWidth = 100;
  doc.image('uploads/logo.png', startX, startY, { width: logoWidth });

  const textWidth = 400;
  const textOffsetX = (780 - textWidth) / 2;

  doc.font('Helvetica-Bold').fontSize(14);
  doc.text("OFFICIAL TRAVEL REQUEST FORM", textOffsetX, startY + 25, {
    align: 'center',
    width: textWidth
  });
  startY += 2.5 * lineHeight;

  doc.font('Helvetica-Bold').fontSize(10);
  drawCell("N R P", startX, startY, 90, lineHeight, {align: 'center'}, true);
  drawCell("N A M E", startX + 90, startY, 180, lineHeight, {align: 'center'}, true);
  drawCell("POSITION", startX + 270, startY, 140, lineHeight, {align: 'center'}, true);
  drawCell("ST TYPE", startX + 410, startY, 100, lineHeight, {align: 'center'}, true);
  drawCell("DEPARTMENT", startX + 510, startY, 270, lineHeight, {align: 'center'}, true);
  startY += lineHeight;

  doc.font('Helvetica').fontSize(10);
  drawCell(trx.nrp, startX, startY, 90, lineHeight);
  drawCell(trx.name, startX + 90, startY, 180, lineHeight);
  drawCell(trx.position, startX + 270, startY, 140, lineHeight);
  drawCell(trx.type, startX + 410, startY, 100, lineHeight);
  drawCell(trx.department, startX + 510, startY, 270, lineHeight);
  startY += lineHeight;

  doc.font('Helvetica-Bold').fontSize(10);

  drawCell("CITY", startX, startY, 390, lineHeight, { align: 'center' }, true);
  drawCell("DESTINATION PLACE", startX + 390, startY, 390, lineHeight, { align: 'center' }, true);
  startY += lineHeight;

  doc.font('Helvetica');

    const allCitys = [
    trx.destinationCity1,
    trx.destinationCity2,
    trx.destinationCity3,
  ]
    .filter(Boolean)
    .map((place) => place?.value ?? place)
    .join('; ');

  const allPlaces = [
    trx.destinationPlace1,
    trx.destinationPlace2,
    trx.destinationPlace3,
  ]
    .filter(Boolean)
    .map((place) => place?.value ?? place)
    .join('; ');

  // Hanya gambar jika ada data
  if (allCitys || allPlaces) {
    drawCell(allCitys, startX, startY, 390, lineHeight);
    drawCell(allPlaces, startX + 390, startY, 390, lineHeight);
    startY += lineHeight;
  }

  const contentWidth = 780;
  const col1Width = contentWidth / 3;
  const col2Width = contentWidth / 3;
  const col3Width = contentWidth - col1Width - col2Width;

  doc.font('Helvetica-Bold');

  drawCell("START DATE", startX, startY, col1Width, lineHeight, { align: 'center' }, true);
  drawCell("END DATE", startX + col1Width, startY, col2Width, lineHeight, { align: 'center' }, true);
  drawCell("TOTAL DAYS", startX + col1Width + col2Width, startY, col3Width, lineHeight, { align: 'center' }, true);
  startY += lineHeight;

  doc.font('Helvetica');

  drawCell(trx.startDate ?? "-", startX, startY, col1Width, lineHeight);
  drawCell(trx.endDate ?? "-", startX + col1Width, startY, col2Width, lineHeight);
  drawCell(trx.totalDays?.toString() ?? "-", startX + col1Width + col2Width, startY, col3Width, lineHeight);
  startY += lineHeight;

  doc.font('Helvetica-Bold');
  drawCell("TRANSPORTATION", startX, startY, 180, lineHeight, { align: 'center' }, true);
  drawCell("LODGING", startX + 180, startY, 120, lineHeight, { align: 'center' }, true);
  drawCell("WORK STATUS", startX + 300, startY, 180, lineHeight, { align: 'center' }, true);
  drawCell("OFFICE ACTIVITIES", startX + 480, startY, 300, lineHeight, { align: 'center' }, true);
  startY += lineHeight;

  doc.font('Helvetica');
  drawCell(trx.transportation ?? "-", startX, startY, 180, lineHeight);
  drawCell(trx.lodging ?? "-", startX + 180, startY, 120, lineHeight);
  drawCell(trx.workStatus ?? "-", startX + 300, startY, 180, lineHeight);
  drawCell(trx.officeActivities ?? "-", startX + 480, startY, 300, lineHeight);
  startY += lineHeight;

  const colPurposeWidth = contentWidth / 2;
  const colAgendaWidth = contentWidth - colPurposeWidth;
  doc.font('Helvetica-Bold').fontSize(10);
  drawCell("PURPOSE", startX, startY, colPurposeWidth, lineHeight, { align: 'center' }, true);
  drawCell("ACTIVITY AGENDA", startX + colPurposeWidth, startY, colAgendaWidth, lineHeight, { align: 'center' }, true);
  startY += lineHeight;

  doc.font('Helvetica');
  drawCell(trx.purpose ?? "-", startX, startY, colPurposeWidth, lineHeight);
  drawCell(trx.agendaActivities ?? "-", startX + colPurposeWidth, startY, colAgendaWidth, lineHeight);
  startY += lineHeight;

  doc.font('Helvetica-Bold');
  if (trx.code?.startsWith('TRF1')) {
    drawCell("FOREIGN CURRENCY BUY RATE", startX, startY, 390, lineHeight, { align: 'center' }, true);
  }
  drawCell("DETAILED TRAVEL COSTS", startX + 390, startY, 390, lineHeight, { align: 'center' }, true);
  startY += lineHeight;

  let currencyStartY = startY;
  let currencyEndY = currencyStartY;
  if (trx.code?.startsWith('TRF1')) {
    doc.font('Helvetica');
    const symbols = (trx.symbolCurrency ?? "").split(',').map((s: string) => s.trim());
    const rates = (trx.currency ?? "").split(',').map((r: string) => r.trim());

    const maxLines = Math.min(3, Math.max(symbols.length, rates.length));
    for (let i = 0; i < maxLines; i++) {
      const symbol = symbols[i] ?? "-";
      const rate = rates[i] ? formatIdr(rates[i]) : "-";

      drawCell(symbol, startX, currencyEndY, 130, lineHeight);
      drawCell(rate, startX + 130, currencyEndY, 260, lineHeight);
      currencyEndY += lineHeight;
    }
  }

  let costY = startY;
  const costFields = [
    ["Taxi Cost", trx.taxiCost],
    ["Car Rental Cost", trx.rentCost],
    ["Hotel Cost", trx.hotelCost],
    ["UPD Cost", trx.updCost],
    ["Fiskal Cost", trx.fiskalCost],
    ["Other Cost", trx.otherCost],
    ["Total Cost", trx.totalCost]
  ];

  const costX = startX + 390;
  const labelWidth = 190;
  const valueWidth = 200;

  costFields.forEach(([label, cost]) => {
  const amount = cost != null ? Number(cost).toLocaleString('id-ID') : "-";

  const totalWidth = labelWidth + valueWidth;

  // Total Cost diberi latar abu-abu
  if (label === "Total Cost") {
    doc.rect(costX, costY, totalWidth, lineHeight).fill('#e0e0e0');
    doc.fillColor('black');
    doc.font('Helvetica-Bold');
  } else {
    doc.font('Helvetica');
  }

  // Draw border cell label
  doc.rect(costX, costY, labelWidth, lineHeight).stroke();
  doc.text(label, costX + 2, costY + 2, {
    width: labelWidth - 4,
    height: lineHeight,
    align: 'left'
  });

  // Draw border cell value
  doc.rect(costX + labelWidth, costY, valueWidth, lineHeight).stroke();

  if (cost != null) {
    // Draw "Rp" di cell value
    doc.text("Rp", costX + labelWidth + 5, costY + 2, {
      width: 25,
      align: 'left'
    });

    // Draw amount (right-aligned)
    doc.text(amount, costX + labelWidth + 30, costY + 2, {
      width: valueWidth - 35,
      align: 'right'
    });
  } else {
    doc.text("-", costX + labelWidth, costY + 2, {
      width: valueWidth,
      align: 'center'
    });
  }

  costY += lineHeight;
},


  startY = Math.max(currencyEndY, costY));

  startY += lineHeight + 104;
  const colWidth = 780 / 4;
  const signGap = 20;
  const textHeight = 12;

  let signers;

  if (trx.code?.startsWith("TRF2")) {
    signers = [
      { title: "Acting Officer", name: `(${trx.name})`, position: "Employee" },
      { title: "Assigning Officer", name: `(${trx.deptheadName})`, position: "Department Head / Project Manager" },
      { title: "Approved By", name: `(${trx.divheadName})`, position: "Division Head" },
      { title: "Acknowledged By", name: "(Rina Rusmayanti)", position: "CHCAS Department Head" }
    ];
  } else {
    signers = [
      { title: "Acting Officer", name: `(${trx.name})`, position: "Employee" },
      { title: "Assigning Officer", name: `(${trx.deptheadName})`, position: "Dept Head / Project Manager" },
      { title: "Approved By", name: `(${trx.divheadName})`, position: "Division Head" },
      { title: "Approved By", name: `(${trx.dicdivName})`, position: "Director In Charge (DIC)" },
      { title: "Acknowledged By", name: "(Rina Rusmayanti)", position: "CHCAS Dept Head" },
      { title: "Acknowledged By", name: "(Arie Sasongko)", position: "CHCS Division Head" },
      { title: "Approved By", name: "(David)", position: "DIC of Human Capital" },
      { title: "Acknowledged By", name: "(Etot Listyono)", position: "President Director" }
    ];
  }

  doc.registerFont('GreatVibes', 'fonts/GreatVibes-Regular.ttf');

  const rows = [];
  if (signers.length > 4) {
    rows.push(signers.slice(0, 4));
    rows.push(signers.slice(4));
  } else {
    rows.push(signers);
  }

  rows.forEach((row, rowIndex) => {
    doc.font('Helvetica-Bold').fontSize(10);
    row.forEach((s, i) => {
      doc.text(s.title, startX + i * colWidth, startY, {
        width: colWidth,
        align: 'center'
      });
    });

    startY += lineHeight + signGap;

    row.forEach((s, i) => {
    const showSign = shouldShowSignature(s.position, trx);

    if (showSign) {
      const cleanName = s.name.replace(/[()]/g, '').trim();
      const firstName = cleanName.split(' ')[0];

      doc.font('GreatVibes').fontSize(28).text(firstName, startX + i * colWidth, startY - 25, {
        width: colWidth,
        align: 'center'
      });
    }

    doc.font('Helvetica').fontSize(10).text(s.name, startX + i * colWidth, startY, {
      width: colWidth,
      align: 'center'
    });
    doc.text(s.position, startX + i * colWidth, startY + textHeight, {
      width: colWidth,
      align: 'center'
    });
  });


    startY += textHeight * 2 + 20;
  });
  doc.end();
};

export const generatePdfDeclaration = (res: any, data: any[]) => {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="travel-report.pdf"');
  doc.pipe(res);

  const startX = 30;
  let startY = 40;
  const lineHeight = 12;
  const colWidth = 260;
  const maxCols = 3;
  const maxRowsPerBlock = 5;

  const trx = data[0];
  doc.image('uploads/logo.png', startX, startY, { width: 80 });
  const pageWidth = 780;
  const textWidth = 400;
  const textX = (pageWidth - textWidth) / 2;

  doc.font('Helvetica-Bold').fontSize(14);
  doc.text("OFFICIAL TRAVEL DECLARATION FORM", textX, startY + 20, {
    align: 'center',
    width: textWidth
  });
  startY += 50;

  doc.font('Helvetica').fontSize(8);

  const labelWidth = 100;
  const colonGap = 5;
  const valueOffset = labelWidth + colonGap + 5;

  const printLabelValue = (x: number, y: number, label: string, value: string) => {
    doc.font('Helvetica')
      .text(label, x, y);

    doc.font('Helvetica')
      .text(':', x + labelWidth, y);

    doc.font('Helvetica-Bold')
      .text(value, x + valueOffset, y, {
        width: colWidth - valueOffset - 10,
        ellipsis: true,
        lineBreak: false,
        height: lineHeight
      });
  };

const travelTo = [trx.travelTo1, trx.travelTo2, trx.travelTo3]
  .filter(val => val && val.trim() !== "")
  .join(", ");


  const entries: [string, string][] = [
    ["TRAVEL NUMBER", trx.nomorOt],
    ["N R P", trx.nrp],
    ["NAME", trx.name],
    ["POSITION", trx.position],
    ["ST TYPE", trx.stType],
    ["DEPARTMENT", trx.department],
    ["DIVISION", trx.division],
    ["COST ALLOCATION", formatRupiah(trx.costAllocation)],
    ["TRAVEL FROM", trx.travelFrom],
    ["TRAVEL TO", travelTo],
    ["DEPARTURE DATE", trx.startDate],
    ["RETURN DATE", trx.endDate],
    ["DEPART. DATE ACTUAL", trx.startDateActual],
    ["RETURN DATE ACTUAL", trx.endDateActual],
    ["WORK STATUS", trx.workStatus],
    ["CURRENCY SYMBOL", trx.currencySymbol],
    ["CURRENCY", formatIdr(trx.currency)],
  ];

  entries.forEach((entry, index) => {
    const block = Math.floor(index / (maxCols * maxRowsPerBlock));
    const positionInBlock = index % (maxCols * maxRowsPerBlock);
    const col = Math.floor(positionInBlock / maxRowsPerBlock);
    const row = positionInBlock % maxRowsPerBlock;
    const x = startX + col * colWidth;
    const y = startY + block * maxRowsPerBlock * lineHeight + row * lineHeight;
    printLabelValue(x, y, entry[0], String(entry[1] ?? "-"));
  });
  
  const tableStartY = Math.max(doc.y + 20, startY);
  const tableStartX = startX;

  const columnWidths = [70, 80, 60, 70, 70, 70, 70, 70, 70, 150];
  const rowHeight = 25;

  const headers = ["Date", "Location", "Hotel Cost", "Consume Cost", "UPD Cost", "Taxi Cost", "Ticket Cost", "Other Cost", "Total Cost", "Note"];

  const dataRows = (trx.details || []).map((detail: any) => [
    detail.date_activity ?? "-",
    detail.location_activity ?? "-",
    formatRupiah(detail.hotel_cost),
    formatRupiah(detail.consume_cost),
    formatRupiah(detail.upd_cost),
    formatRupiah(detail.taxi_cost),
    formatRupiah(detail.ticket_cost),
    formatRupiah(detail.other_cost),
    formatRupiah(detail.total_cost),
    detail.explanation ?? "-"
  ]);

    const totalPengeluaran = (trx.details || []).reduce((sum:number, detail:any) => {
    return sum + (Number(detail.total_cost) || 0);
  }, 0);

  const downPayment = trx.downPayment || 0;
  const pengurangan = totalPengeluaran - downPayment;
  let y = tableStartY;
  let x = tableStartX;
  headers.forEach((text, colIndex) => {
    doc.rect(x, y, columnWidths[colIndex], rowHeight).stroke();
    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .text(text, x + 2, y + 6, {
        width: columnWidths[colIndex] - 4,
        align:'center',
      });
    x += columnWidths[colIndex];
  });
  y += rowHeight;

  dataRows.forEach((row: any) => {
    let x = tableStartX;
    row.forEach((text: any, colIndex: any) => {
      const cellWidth = columnWidths[colIndex];
      doc.rect(x, y, cellWidth, rowHeight).stroke();
      doc.font('Helvetica').fontSize(8);

      if (colIndex >= 2 && colIndex <= 8 && text !== "-") {
        // Pisahkan Rp dan angka
        const parts = text.replace("Rp", "").trim();
        const valueOnly = parts; // Angka saja

        // Tulis "Rp" rata kiri
        doc.text("Rp", x + 2, y + 6, {
          width: 20,
          align: 'left',
        });

        // Tulis angka rata kanan di sisa space
        doc.text(valueOnly, x + 22, y + 6, {
          width: cellWidth - 24,
          align: 'right',
        });
      } else {
        // Normal text
        doc.text(text, x + 2, y + 6, {
          width: cellWidth - 4,
          align: 'left',
        });
      }

      x += cellWidth;
    });
    y += rowHeight;
  });

  y += 20;

  doc.font('Helvetica-Bold').fontSize(9);
  doc.text('EXPENSE DETAILS', startX, y);
  y += 16;

  doc.font('Helvetica').fontSize(8);
  const printSummary = (label: string, value: number) => {
    doc.text(label, startX, y);
    doc.text(':', startX + 120, y);

    const xValueStart = startX + 130;
    const cellWidth = 100;

    // Pecah jadi Rp dan angka
    const formattedValue = formatRupiah(value).replace("Rp", "").trim();

    // Rp kiri
    doc.text('Rp', xValueStart, y, {
      width: 20,
      align: 'left',
    });

    // Angka kanan
    doc.text(formattedValue, xValueStart + 20, y, {
      width: cellWidth - 20,
      align: 'right',
    });

    y += 14;
  };


  printSummary('Total Expenses', totalPengeluaran);
  printSummary('Down Payment', downPayment);
  printSummary('Difference / Deduction', pengurangan);

  let signStartY = y + 40; 
  const signGap = 40;
  const textHeight = 12;

 const signers = [
  { title: "Acting Officer", name: `(${trx.name})`, position: "Employee" },
  { title: "Acknowledged By", name: `(${trx.deptheadName})`, position: "Dept Head / Project Manager" },
  { title: "Approved By", name: "(Rina Rusmayanti)", position: "CHCAS Dept Head" }
];

doc.registerFont('GreatVibes', 'fonts/GreatVibes-Regular.ttf');

const rows = signers.length > 4 ? [signers.slice(0, 4), signers.slice(4)] : [signers];

rows.forEach((row) => {
  doc.font('Helvetica-Bold').fontSize(10);

  row.forEach((s, i) => {
    doc.text(s.title, startX + i * colWidth, signStartY, {
      width: colWidth,
      align: 'center'
    });
  });

  row.forEach((s, i) => {
    const showSign = shouldShowSignatureDeclaration(s.title, trx);
    const cleanName = s.name.replace(/[()]/g, '').trim();
    const firstName = cleanName.split(' ')[0];

    if (showSign) {
      doc.font('GreatVibes').fontSize(28).text(firstName, startX + i * colWidth, signStartY + 15, {
        width: colWidth,
        align: 'center'
      });
    }

    doc.font('Helvetica').fontSize(10).text(s.name, startX + i * colWidth, signStartY + 45, {
      width: colWidth,
      align: 'center'
    });
  });

  // Tampilkan posisi jabatan
  row.forEach((s, i) => {
    doc.text(s.position, startX + i * colWidth, signStartY + 45 + textHeight + 5, {
      width: colWidth,
      align: 'center'
    });
  });

  signStartY += textHeight * 5 + 20;
});
  doc.end();
};
export const generatePdfResign = (res: any, data: any[]) => {
  const doc = new PDFDocument({ margin: 50, size: "A4" });

  const startX = 50;
  const logoWidth = 100;
  const logoY = 30;

  const pageWidth = doc.page.width;
  const margin = doc.page.margins.left;
  const textWidth = pageWidth - margin * 2;
  const halfPage = pageWidth / 2;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "inline; filename=surat-resign.pdf");
  doc.pipe(res);

  data.forEach((item, index) => {
    if (index > 0) doc.addPage();

    doc.image("uploads/logo.png", startX, logoY, { width: logoWidth });
    doc.moveDown(2);

    doc.font("Times-Bold").fontSize(16).text("SURAT PENGUNDURAN DIRI", { align: "center" });
    doc.moveDown(2);

    // Kepada Yth
    doc.font("Times-Roman").fontSize(12);
    doc.text("Kepada Yth:", margin, doc.y);
    doc.text("HRD PT United Tractors Pandu Engineering", margin, doc.y);
    doc.text("Di Tempat", margin, doc.y);

    doc.moveDown();
    doc.text("Dengan hormat,", margin, doc.y);

    doc.moveDown();
    doc.text("Saya yang bertanda tangan di bawah ini:", margin, doc.y);

    // Info pribadi dengan titik dua sejajar
    const labelX = margin;
    const colonX = margin + 85;
    const valueX = colonX + 10;
    let currentY = doc.y + 10;

    doc.text("Nama", labelX, currentY);
    doc.text(":", colonX, currentY);
    doc.text(item.name, valueX, currentY);

    currentY += 15;
    doc.text("Departemen", labelX, currentY);
    doc.text(":", colonX, currentY);
    doc.text(item.department, valueX, currentY);

    currentY += 15;
    doc.text("Posisi", labelX, currentY);
    doc.text(":", colonX, currentY);
    doc.text(item.userPosition, valueX, currentY);

    doc.moveDown(2);

    // Paragraf isi surat (rata kiri, lebar penuh)
    const addParagraph = (text: string) => {
      doc.text(text, margin, doc.y, { width: textWidth, align: "justify" });
      doc.moveDown();
    };

    addParagraph(
      `Dengan ini saya mengajukan permohonan pengunduran diri dari jabatan saya sebagai ${item.userPosition} di PT United Tractors Pandu Engineering. Keputusan ini saya buat setelah melalui pertimbangan matang dan berbagai pertimbangan pribadi.`
    );

    addParagraph(
      `Adapun alasan utama saya mengajukan pengunduran diri ini adalah ${item.reason}. Saya memahami bahwa keputusan ini mungkin menimbulkan ketidaknyamanan, namun saya percaya bahwa ini adalah keputusan terbaik bagi diri saya dan masa depan karir saya.`
    );

    addParagraph(
      `Saya berencana untuk menjalani masa kerja hingga tanggal ${item.effectiveDate}, yang akan menjadi hari terakhir saya bekerja.`
    );

    addParagraph(
      `Saya ingin mengucapkan terima kasih yang sebesar-besarnya atas kesempatan yang telah diberikan oleh perusahaan selama ini. Pengalaman dan pengetahuan yang saya peroleh di sini sangat berharga bagi perkembangan karir saya. Saya juga menghargai dukungan dan kerjasama yang diberikan oleh rekan-rekan dan atasan saya selama bekerja.`
    );

    addParagraph(
      `Apabila ada hal-hal yang perlu diselesaikan sebelum tanggal efektif pengunduran diri, saya siap untuk membantu dalam proses transisi dan penyerahan tanggung jawab.`
    );

    addParagraph(`Terima kasih atas perhatian dan pengertian Bapak/Ibu.`);

    doc.moveDown(4);
    const signatureY = doc.y;

    // Judul selalu tampil (Times-Roman)
    doc.font('Times-Roman').fontSize(12);
    doc.text("Hormat Saya,", margin, signatureY);
    doc.text("Atasan Langsung,", halfPage, signatureY, { align: "right" });

    const ttdY = signatureY + 20;
    const nameY = signatureY + 60;

    // Nama depan untuk tanda tangan
    const firstName = item.name.split(" ")[0];
    const deptheadFirstName = item.deptheadName.split(" ")[0];

    // Register font untuk tanda tangan
    doc.registerFont('GreatVibes', 'fonts/GreatVibes-Regular.ttf');

    // TTD "Hormat Saya" jika diizinkan
    if (shouldShowSignatureResign('Hormat Saya', item)) {
      doc.font('GreatVibes').fontSize(24).text(firstName, margin, ttdY);
    }

    // TTD "Atasan Langsung" jika diizinkan
    if (shouldShowSignatureResign('Atasan Langsung', item)) {
      doc.font('GreatVibes').fontSize(24).text(deptheadFirstName, halfPage, ttdY, { align: "right" });
    }

    // Nama selalu tampil di bawah tanda tangan
    doc.font('Times-Roman').fontSize(12);
    doc.text(`(${item.name})`, margin, nameY);
    doc.text(`(${item.deptheadName})`, halfPage, nameY, { align: "right" });
  });

  doc.end();
};


export const generatePdfMutation = (res: any, data: any[]) => {
  const doc = new PDFDocument({ margin: 50, size: "A4" });

  const startX = 50;
  const logoWidth = 100;
  const logoY = 30;

  const pageWidth = doc.page.width;
  const margin = doc.page.margins.left;
  const textWidth = pageWidth - margin * 2;
  const halfPage = pageWidth / 2;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "inline; filename=surat-resign.pdf");
  doc.pipe(res);

    const addParagraph = (text: string) => {
      doc.text(text, margin, doc.y, { width: textWidth, align: "justify" });
      doc.moveDown();
    };

  data.forEach((item, index) => {
    if (index > 0) doc.addPage();

    try {
      doc.image("uploads/logo.png", startX, logoY, { width: logoWidth });
    } catch {}

    doc.moveDown(3);

    doc.font("Times-Bold").fontSize(16).text("SURAT MUTASI KARYAWAN", { align: "center" });
    doc.moveDown();

    const labelX = margin;
    const colonX = margin + 85;
    const valueX = colonX + 10;
    let currentY = doc.y + 10;

    doc.font("Times-Roman").fontSize(12);
    doc.text("Yang bertanda tangan di bawah ini:");
    doc.moveDown();

    currentY += 15;
    doc.text("Nama", labelX, currentY);
    doc.text(":", colonX, currentY);
    doc.text(item.name, valueX, currentY);

    currentY += 15;
    doc.text("Divisi", labelX, currentY);
    doc.text(":", colonX, currentY);
    doc.text(item.divisionFrom, valueX, currentY);

    currentY += 15;
    doc.text("Departemen", labelX, currentY);
    doc.text(":", colonX, currentY);
    doc.text(item.deptFrom, valueX, currentY);

    currentY += 15;
    doc.moveDown(2);
    addParagraph("Yang dengan ini bertindak atas nama PT United Tractors Pandu Engineering, memutuskan untuk melakukan mutasi terhadap karyawan partner PT. United Tractors Pandu Engineering di bawah ini:");
    doc.moveDown();

    currentY += 50;
    doc.text("Nama", labelX, currentY);
    doc.text(":", colonX, currentY);
    doc.text(item.name, valueX, currentY);

    currentY += 15;
    doc.text("Divisi", labelX, currentY);
    doc.text(":", colonX, currentY);
    doc.text(item.divisionTo, valueX, currentY);

    currentY += 15;
    doc.text("Jabatan", labelX, currentY);
    doc.text(":", colonX, currentY);
    doc.text(item.deptTo, valueX, currentY);

    doc.moveDown();
    addParagraph("Divisi serta departemen yang baru adalah sebagai berikut:");
    doc.moveDown();

    currentY += 30;
    doc.text("Divisi", labelX, currentY);
    doc.text(":", colonX, currentY);
    doc.text(item.divisionTo, valueX, currentY);

    currentY += 15;
    doc.text("Departemen", labelX, currentY);
    doc.text(":", colonX, currentY);
    doc.text(item.deptTo, valueX, currentY);

    doc.moveDown();
    addParagraph(`Proses mutasi ini mulai efektif pada tanggal ${item.effectiveDate}. Oleh karena itu, kepada karyawan yang bersangkutan untuk segera mempersiapkan segala sesuatunya sebelum tanggal tersebut.`);

    addParagraph(`Demikian surat mutasi ini dibuat untuk dapat dipergunakan sebagaimana mestinya.`);

    doc.moveDown(4);
    const signatureY = doc.y;

    doc.font("Times-Roman").fontSize(12);
    doc.text("Hormat Saya,", margin, signatureY);
    doc.text("Atasan Langsung,", halfPage, signatureY, { align: "right" });

    const ttdY = signatureY + 20;
    const nameY = signatureY + 60;

    const firstName = item.name.split(" ")[0];
    const deptheadFirstName = item.superiorFrom.split(" ")[0];

    try {
      doc.registerFont('GreatVibes', 'fonts/GreatVibes-Regular.ttf');

      if (shouldShowSignatureResign('Hormat Saya', item)) {
        doc.font('GreatVibes').fontSize(24).text(firstName, margin, ttdY);
      }

      if (shouldShowSignatureResign('Atasan Langsung', item)) {
        doc.font('GreatVibes').fontSize(24).text(deptheadFirstName, halfPage, ttdY, { align: "right" });
      }

      doc.font('Times-Roman').fontSize(12);
    } catch {}

    doc.text(`(${item.name})`, margin, nameY);
    doc.text(`(${item.deptheadName})`, halfPage, nameY, { align: "right" });
  });

  doc.end();
};
