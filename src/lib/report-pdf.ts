import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { MonthReport } from "./month-report";
import { formatDuration } from "./worklog-progress";

export function reportPdf(report: MonthReport): Blob {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setProperties({
    title: `Torna a Casa - Resoconto ${report.month}`,
    author: "Torna a Casa",
  });
  const monthLabel = new Date(`${report.month}-01T12:00:00`).toLocaleDateString(
    "it-IT",
    { month: "long", year: "numeric" },
  );
  doc.setFontSize(22);
  doc.setTextColor(15, 65, 58);
  doc.text("Torna a Casa", 14, 19);
  doc.setFontSize(12);
  doc.setTextColor(45, 55, 65);
  doc.text(`Resoconto mensile - ${monthLabel}`, 14, 28);
  doc.setFontSize(10);
  doc.text(
    `Lavoro: ${formatDuration(report.totals.worked)}   |   Credito: ${formatDuration(report.totals.credit)}   |   Debito: ${formatDuration(report.totals.debt)}   |   Assenze: ${report.totals.leaveDays} giorni`,
    14,
    38,
  );
  doc.text(
    `${report.totals.validDays} presenze valide. ${report.anomalies.length} giornate da verificare escluse dai totali orari.`,
    14,
    45,
  );
  autoTable(doc, {
    startY: 51,
    margin: { top: 15, bottom: 22 },
    head: [
      [
        "Data",
        "Tipo",
        "Ingresso",
        "Pausa",
        "Uscita",
        "Lavoro",
        "Permesso",
        "Saldo",
        "Verifiche / note",
      ],
    ],
    body: report.rows.map((row) => [
      row.dayKey.split("-").reverse().join("/"),
      row.label,
      row.record?.morningIn || "-",
      row.record?.pauseNoExit
        ? "30 min"
        : row.record?.lunchOut
          ? `${row.record.lunchOut} - ${row.record.lunchIn || "?"}`
          : "-",
      row.record?.finalOut || "-",
      row.totals ? formatDuration(row.totals.worked) : "-",
      row.totals ? formatDuration(row.totals.permit) : "-",
      row.totals
        ? `${row.totals.balance < 0 ? "-" : "+"}${formatDuration(Math.abs(row.totals.balance))}`
        : "-",
      [
        ...row.issues,
        ...row.absences.map((leave) => leave.notes).filter(Boolean),
      ].join("; ") || "Regolare",
    ]),
    styles: { fontSize: 8, cellPadding: 3, overflow: "linebreak" },
    headStyles: { fillColor: [15, 85, 72] },
    alternateRowStyles: { fillColor: [242, 247, 245] },
    columnStyles: {
      0: { cellWidth: 23 },
      1: { cellWidth: 34 },
      8: { cellWidth: 64 },
    },
    didDrawPage: () => {
      doc.setFontSize(8);
      doc.setTextColor(80);
      doc.text(
        "Orari: obiettivo 7h12, pausa minima 30 min, permessi da recuperare. Assenze: lun-ven, festività non escluse.",
        14,
        197,
      );
      doc.text(
        `Creato il ${new Date().toLocaleDateString("it-IT")} - Pagina ${doc.getNumberOfPages()}`,
        14,
        202,
      );
    },
  });
  return doc.output("blob");
}
