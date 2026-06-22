import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const REPORT_TITLE = "BYT WEEKLY SUMMARY";
const BANK_DETAILS = "B.Y.T. ENTERPRISE / UOB MALAYSIA / 2383066532";
const RECEIPT_INSTRUCTION =
  "After payment, send the receipt to WhatsApp: 6014-2889116 (Oscar Kho)";
const PAGE_MARGIN_X = 14;
const HEADER_START_Y = 14;
const TABLE_START_Y = 76;

function padNumber(value) {
  return String(value).padStart(2, "0");
}

function localDateKey(date) {
  return [
    date.getFullYear(),
    padNumber(date.getMonth() + 1),
    padNumber(date.getDate()),
  ].join("-");
}

function formatDisplayDate(dateKey) {
  const [year, month, day] = String(dateKey || "").split("-");

  if (!year || !month || !day) {
    return "";
  }

  return `${day}/${month}/${year}`;
}

function createValidDate(year, monthIndex, day) {
  const date = new Date(year, monthIndex, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== monthIndex ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function addDateKey(keys, date) {
  if (date && !Number.isNaN(date.getTime())) {
    keys.add(localDateKey(date));
  }
}

function getDateKeys(dateValue) {
  const keys = new Set();

  if (!dateValue) {
    return keys;
  }

  if (dateValue instanceof Date) {
    addDateKey(keys, dateValue);
    return keys;
  }

  const dateText = String(dateValue).trim();
  const isoDateMatch = dateText.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);

  if (isoDateMatch) {
    const [, year, month, day] = isoDateMatch;
    addDateKey(
      keys,
      createValidDate(Number(year), Number(month) - 1, Number(day))
    );
  }

  const slashDateMatch = dateText.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (slashDateMatch) {
    const [, first, second, year] = slashDateMatch;
    const firstNumber = Number(first);
    const secondNumber = Number(second);
    const yearNumber = Number(year);

    addDateKey(keys, createValidDate(yearNumber, secondNumber - 1, firstNumber));
    addDateKey(keys, createValidDate(yearNumber, firstNumber - 1, secondNumber));
  }

  const parsedDate = new Date(dateText);
  addDateKey(keys, parsedDate);

  return keys;
}

function hasDateKey(dateValue, dateKey) {
  return getDateKeys(dateValue).has(dateKey);
}

function getPrimaryDateKey(dateValue) {
  return [...getDateKeys(dateValue)][0] || "";
}

function getSessionChargeDateText(description) {
  const match = String(description || "").match(/session charge\s*-\s*(.+)$/i);
  return match ? match[1].trim() : "";
}

function transactionMatchesReportDate(transaction, reportDateKey) {
  const description = String(transaction.description || "").toLowerCase();
  const type = String(transaction.type || "").toLowerCase();
  const isSessionCharge =
    type === "session_charge" || description.includes("session charge");

  if (hasDateKey(transaction.date, reportDateKey)) {
    return true;
  }

  if (!isSessionCharge) {
    return false;
  }

  return hasDateKey(getSessionChargeDateText(transaction.description), reportDateKey);
}

function getTransactionEffectiveDateKey(transaction) {
  const description = String(transaction.description || "").toLowerCase();
  const type = String(transaction.type || "").toLowerCase();
  const isSessionCharge =
    type === "session_charge" || description.includes("session charge");

  if (isSessionCharge) {
    const sessionChargeDateKey = getPrimaryDateKey(
      getSessionChargeDateText(transaction.description)
    );

    if (sessionChargeDateKey) {
      return sessionChargeDateKey;
    }
  }

  return getPrimaryDateKey(transaction.date);
}

function isReportExpenseTransaction(transaction, reportDateKey) {
  const amount = Number(transaction.amount || 0);

  if (amount >= 0) {
    return false;
  }

  const description = String(transaction.description || "").toLowerCase();
  const type = String(transaction.type || "").toLowerCase();
  const isExpense =
    type === "manual_expense" ||
    type === "session_charge" ||
    description.includes("expense") ||
    description.includes("session charge");

  return isExpense && transactionMatchesReportDate(transaction, reportDateKey);
}

function formatMoney(value, options = {}) {
  const amount = Number(value || 0);

  if (options.parenthesizeNegative && amount < 0) {
    return `(RM${Math.abs(amount).toFixed(2)})`;
  }

  return `RM${Math.abs(amount).toFixed(2)}`;
}

function getBalanceStyle(member, balanceValue = member.balance) {
  const status = String(member.status || "active").toLowerCase();
  const balance = Number(balanceValue || 0);

  if (status !== "active") {
    return { fillColor: [0, 112, 255], textColor: [255, 255, 255] };
  }

  if (balance < 30) {
    return { fillColor: [255, 0, 255], textColor: [0, 0, 0] };
  }

  if (balance < 60) {
    return { fillColor: [255, 0, 0], textColor: [0, 0, 0] };
  }

  return { fillColor: [0, 255, 0], textColor: [0, 0, 0] };
}

function getMemberReportBalance(member, transactions, reportDateKey) {
  const futureTransactionTotal = transactions
    .filter(
      (transaction) =>
        Number(transaction.memberId) === Number(member.id) &&
        getTransactionEffectiveDateKey(transaction) > reportDateKey
    )
    .reduce(
      (total, transaction) => total + Number(transaction.amount || 0),
      0
    );

  return Number((Number(member.balance || 0) - futureTransactionTotal).toFixed(2));
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }

  return btoa(binary);
}

function getImageMimeType(buffer) {
  const bytes = new Uint8Array(buffer);

  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    return "image/jpeg";
  }

  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }

  return "image/jpeg";
}

function getImageFormat(mimeType) {
  return mimeType === "image/png" ? "PNG" : "JPEG";
}

async function loadImageDataUrl(imageUrl) {
  if (!imageUrl) {
    return null;
  }

  try {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      return null;
    }

    const buffer = await response.arrayBuffer();
    const mimeType = getImageMimeType(buffer);

    return {
      dataUrl: `data:${mimeType};base64,${arrayBufferToBase64(buffer)}`,
      format: getImageFormat(mimeType),
    };
  } catch (error) {
    console.warn(`Failed to load PDF image: ${imageUrl}`, error);
    return null;
  }
}

function drawPageHeader(doc, reportDateLabel, logoDataUrl) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - PAGE_MARGIN_X * 2;
  const logoSize = 34;
  const logoX = pageWidth - PAGE_MARGIN_X - logoSize;
  const titleBoxWidth = contentWidth - logoSize - 10;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.35);

  doc.rect(PAGE_MARGIN_X, HEADER_START_Y, titleBoxWidth, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(42, 42, 76);
  doc.text(REPORT_TITLE, PAGE_MARGIN_X + titleBoxWidth / 2, HEADER_START_Y + 12.5, {
    align: "center",
  });

  doc.rect(PAGE_MARGIN_X, HEADER_START_Y + 34, titleBoxWidth, 15);
  doc.setFontSize(10);
  doc.text("Date", PAGE_MARGIN_X + 4, HEADER_START_Y + 43.5);
  doc.text(reportDateLabel, PAGE_MARGIN_X + titleBoxWidth / 2, HEADER_START_Y + 43.5, {
    align: "center",
  });

  if (logoDataUrl) {
    doc.addImage(
      logoDataUrl.dataUrl,
      logoDataUrl.format,
      logoX,
      HEADER_START_Y - 2,
      logoSize,
      logoSize
    );
  }
}

function drawLegendItem(doc, x, y, color, label) {
  doc.setFillColor(...color);
  doc.setDrawColor(0, 0, 0);
  doc.rect(x, y - 4.2, 7, 5.2, "FD");
  doc.setTextColor(0, 0, 0);
  doc.text(label, x + 10, y);
}

function drawLegendAndBankSection(doc, startY, qrDataUrl) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const sectionWidth = pageWidth - PAGE_MARGIN_X * 2;
  const sectionHeight = 48;
  const qrSize = 30;
  const qrX = pageWidth - PAGE_MARGIN_X - qrSize - 4;
  const textMaxWidth = qrDataUrl ? sectionWidth - qrSize - 16 : sectionWidth - 8;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(PAGE_MARGIN_X, startY, sectionWidth, sectionHeight);

  doc.setDrawColor(210, 210, 210);
  doc.line(PAGE_MARGIN_X + 4, startY + 29, PAGE_MARGIN_X + textMaxWidth, startY + 29);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(42, 42, 76);
  doc.text("Color Legend", PAGE_MARGIN_X + 4, startY + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  drawLegendItem(doc, PAGE_MARGIN_X + 4, startY + 17, [0, 255, 0], "Green - RM60 above");
  drawLegendItem(doc, PAGE_MARGIN_X + 4, startY + 26, [255, 0, 0], "Red - RM60 below");
  drawLegendItem(
    doc,
    PAGE_MARGIN_X + 58,
    startY + 17,
    [255, 0, 255],
    "Purple - RM30 below - Must Reload"
  );
  drawLegendItem(doc, PAGE_MARGIN_X + 58, startY + 26, [0, 112, 255], "Blue - Dormant");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Bank Details", PAGE_MARGIN_X + 4, startY + 37);
  doc.setFont("helvetica", "normal");
  doc.text(BANK_DETAILS, PAGE_MARGIN_X + 34, startY + 37, {
    maxWidth: textMaxWidth - 34,
  });
  doc.text(RECEIPT_INSTRUCTION, PAGE_MARGIN_X + 4, startY + 44, {
    maxWidth: textMaxWidth,
  });

  if (qrDataUrl) {
    doc.setDrawColor(220, 220, 220);
    doc.rect(qrX - 2, startY + 8, qrSize + 4, qrSize + 4);
    doc.addImage(
      qrDataUrl.dataUrl,
      qrDataUrl.format,
      qrX,
      startY + 10,
      qrSize,
      qrSize
    );
  }
}

function addPageNumbers(doc) {
  const pageCount = doc.getNumberOfPages();

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    doc.setPage(pageNumber);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(
      `Page ${pageNumber} of ${pageCount}`,
      doc.internal.pageSize.getWidth() - 14,
      doc.internal.pageSize.getHeight() - 8,
      { align: "right" }
    );
  }
}

function buildReportRows(members, transactions, reportDateKey) {
  const reportTransactions = transactions.filter((transaction) =>
    isReportExpenseTransaction(transaction, reportDateKey)
  );

  return members
    .filter((member) => String(member.status || "").toLowerCase() !== "pending")
    .map((member, index) => {
      const memberExpense = reportTransactions
        .filter(
          (transaction) => Number(transaction.memberId) === Number(member.id)
        )
        .reduce(
          (total, transaction) => total + Math.abs(Number(transaction.amount || 0)),
          0
        );
      const reportBalance = getMemberReportBalance(
        member,
        transactions,
        reportDateKey
      );

      return [
        index + 1,
        member.name || "",
        formatMoney(memberExpense),
        formatMoney(reportBalance, { parenthesizeNegative: true }),
        { member, reportBalance },
      ];
    });
}

export async function exportWeeklyReportPdf({
  members,
  transactions,
  reportDate,
  logoUrl,
  qrUrl,
}) {
  const reportDateKey = [...getDateKeys(reportDate)][0] || localDateKey(new Date());
  const reportDateLabel = formatDisplayDate(reportDateKey);
  const expenseHeader = `Expenses on ${reportDateLabel}`;
  const [logoDataUrl, qrDataUrl] = await Promise.all([
    loadImageDataUrl(logoUrl),
    loadImageDataUrl(qrUrl),
  ]);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const tableRows = buildReportRows(members || [], transactions || [], reportDateKey);

  autoTable(doc, {
    head: [["No.", "Name", expenseHeader, "Balance"]],
    body: tableRows.map((row) => row.slice(0, 4)),
    startY: TABLE_START_Y,
    margin: { top: TABLE_START_Y, left: PAGE_MARGIN_X, right: PAGE_MARGIN_X, bottom: 20 },
    tableLineColor: [0, 0, 0],
    tableLineWidth: 0.25,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8.2,
      cellPadding: { top: 1.45, right: 1.6, bottom: 1.45, left: 1.6 },
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      textColor: [42, 42, 76],
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: [245, 247, 250],
      textColor: [42, 42, 76],
      fontStyle: "bold",
      halign: "center",
      lineColor: [0, 0, 0],
      lineWidth: 0.25,
    },
    columnStyles: {
      0: { cellWidth: 15, halign: "center" },
      1: { cellWidth: 76 },
      2: { cellWidth: 55, halign: "center" },
      3: { cellWidth: 36, halign: "center" },
    },
    alternateRowStyles: {
      fillColor: [252, 252, 252],
    },
    didParseCell: (data) => {
      if (data.section !== "body" || data.column.index !== 3) {
        return;
      }

      const rowMeta = tableRows[data.row.index]?.[4];

      if (!rowMeta) {
        return;
      }

      const balanceStyle = getBalanceStyle(
        rowMeta.member,
        rowMeta.reportBalance
      );
      data.cell.styles.fillColor = balanceStyle.fillColor;
      data.cell.styles.textColor = balanceStyle.textColor;
      data.cell.styles.fontStyle = "normal";
    },
    didDrawPage: () => {
      drawPageHeader(doc, reportDateLabel, logoDataUrl);
    },
  });

  doc.setPage(doc.getNumberOfPages());
  let sectionY = (doc.lastAutoTable?.finalY || TABLE_START_Y) + 8;

  if (sectionY > 238) {
    doc.addPage();
    drawPageHeader(doc, reportDateLabel, logoDataUrl);
    sectionY = TABLE_START_Y;
  }

  drawLegendAndBankSection(doc, sectionY, qrDataUrl);
  addPageNumbers(doc);
  doc.save(`BYT-Weekly-Summary-${reportDateKey}.pdf`);
}
