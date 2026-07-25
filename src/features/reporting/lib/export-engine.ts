/**
 * Client-side export helpers — CSV, Excel, PDF, and print. No backend, no
 * network calls: everything is generated in the browser from data already
 * on the page and downloaded directly.
 *
 * Excel export deliberately does NOT use the `xlsx` (SheetJS) npm package —
 * it has unpatched high-severity prototype-pollution/ReDoS advisories. Since
 * we only ever WRITE our own trusted data (never parse an uploaded file),
 * the well-known "HTML table saved as .xls" technique gives Excel a file it
 * opens natively, with zero vulnerable dependencies.
 */

export type ExportRow = Record<string, string | number>;

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function escapeCsvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function exportToCsv(filename: string, rows: ExportRow[]): void {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => headers.map((key) => escapeCsvCell(row[key] ?? "")).join(",")),
  ];
  downloadBlob(`${filename}.csv`, new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }));
}

function escapeHtml(value: string | number): string {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function exportToExcel(filename: string, rows: ExportRow[]): void {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const headRow = `<tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr>`;
  const bodyRows = rows
    .map(
      (row) =>
        `<tr>${headers.map((key) => `<td>${escapeHtml(row[key] ?? "")}</td>`).join("")}</tr>`,
    )
    .join("");

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8" /></head>
<body><table>${headRow}${bodyRows}</table></body>
</html>`;

  downloadBlob(
    `${filename}.xls`,
    new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" }),
  );
}

export async function exportToPdf(
  filename: string,
  title: string,
  headers: string[],
  rows: (string | number)[][],
): Promise<void> {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableModule.default;

  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Generated ${new Date().toLocaleString()}`, 14, 25);

  autoTable(doc, {
    startY: 32,
    head: [headers],
    body: rows,
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [63, 81, 181] },
    alternateRowStyles: { fillColor: [246, 247, 251] },
  });

  doc.save(`${filename}.pdf`);
}

export function printReport(): void {
  window.print();
}

export { exportChartAsPng } from "@/lib/chart-export";
