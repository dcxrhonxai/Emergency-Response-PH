import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

interface AlertStats {
  total: number;
  active: number;
  resolved: number;
  escalated: number;
  avgResponseTime: number;
}

interface AlertByType {
  type: string;
  count: number;
}

interface DailyActivity {
  date: string;
  alerts: number;
  resolved: number;
}

interface ExportData {
  stats: AlertStats;
  alertsByType: AlertByType[];
  dailyActivity: DailyActivity[];
  dateRange: string;
}

export const exportToCSV = (data: ExportData): void => {
  const lines: string[] = [];
  const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm");
  
  // Summary section
  lines.push("EMERGENCY RESPONSE ANALYTICS REPORT");
  lines.push(`Generated: ${format(new Date(), "PPpp")}`);
  lines.push(`Date Range: Last ${data.dateRange} days`);
  lines.push("");
  
  // Stats summary
  lines.push("SUMMARY STATISTICS");
  lines.push("Metric,Value");
  lines.push(`Total Alerts,${data.stats.total}`);
  lines.push(`Active Alerts,${data.stats.active}`);
  lines.push(`Resolved Alerts,${data.stats.resolved}`);
  lines.push(`Escalated Alerts,${data.stats.escalated}`);
  lines.push(`Avg Response Time (min),${data.stats.avgResponseTime}`);
  lines.push(`Resolution Rate,${data.stats.total > 0 ? Math.round((data.stats.resolved / data.stats.total) * 100) : 0}%`);
  lines.push("");
  
  // Alert types
  lines.push("ALERTS BY TYPE");
  lines.push("Type,Count,Percentage");
  data.alertsByType.forEach(item => {
    const percentage = data.stats.total > 0 ? ((item.count / data.stats.total) * 100).toFixed(1) : "0";
    lines.push(`${item.type},${item.count},${percentage}%`);
  });
  lines.push("");
  
  // Daily activity
  lines.push("DAILY ACTIVITY");
  lines.push("Date,Alerts Created,Alerts Resolved");
  data.dailyActivity.forEach(day => {
    lines.push(`${day.date},${day.alerts},${day.resolved}`);
  });
  
  const csvContent = lines.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `analytics_report_${timestamp}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
};

export const exportToPDF = (data: ExportData): void => {
  const doc = new jsPDF();
  const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm");
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Emergency Response Analytics", pageWidth / 2, 20, { align: "center" });
  
  // Subtitle
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`Report Generated: ${format(new Date(), "PPpp")}`, pageWidth / 2, 30, { align: "center" });
  doc.text(`Date Range: Last ${data.dateRange} days`, pageWidth / 2, 37, { align: "center" });
  
  // Summary stats table
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Summary Statistics", 14, 52);
  
  autoTable(doc, {
    startY: 57,
    head: [["Metric", "Value"]],
    body: [
      ["Total Alerts", data.stats.total.toString()],
      ["Active Alerts", data.stats.active.toString()],
      ["Resolved Alerts", data.stats.resolved.toString()],
      ["Escalated Alerts", data.stats.escalated.toString()],
      ["Avg Response Time", `${data.stats.avgResponseTime} minutes`],
      ["Resolution Rate", `${data.stats.total > 0 ? Math.round((data.stats.resolved / data.stats.total) * 100) : 0}%`],
      ["Escalation Rate", `${data.stats.total > 0 ? Math.round((data.stats.escalated / data.stats.total) * 100) : 0}%`]
    ],
    theme: "striped",
    headStyles: { fillColor: [239, 68, 68] }
  });
  
  // Alert types table
  const finalY1 = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || 100;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Alerts by Type", 14, finalY1 + 15);
  
  autoTable(doc, {
    startY: finalY1 + 20,
    head: [["Emergency Type", "Count", "Percentage"]],
    body: data.alertsByType.map(item => [
      item.type,
      item.count.toString(),
      `${data.stats.total > 0 ? ((item.count / data.stats.total) * 100).toFixed(1) : "0"}%`
    ]),
    theme: "striped",
    headStyles: { fillColor: [239, 68, 68] }
  });
  
  // Daily activity table (new page if needed)
  const finalY2 = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || 150;
  
  if (finalY2 > 220) {
    doc.addPage();
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Daily Activity", 14, 20);
    
    autoTable(doc, {
      startY: 25,
      head: [["Date", "Alerts Created", "Alerts Resolved"]],
      body: data.dailyActivity.map(day => [
        day.date,
        day.alerts.toString(),
        day.resolved.toString()
      ]),
      theme: "striped",
      headStyles: { fillColor: [239, 68, 68] }
    });
  } else {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Daily Activity", 14, finalY2 + 15);
    
    autoTable(doc, {
      startY: finalY2 + 20,
      head: [["Date", "Alerts Created", "Alerts Resolved"]],
      body: data.dailyActivity.map(day => [
        day.date,
        day.alerts.toString(),
        day.resolved.toString()
      ]),
      theme: "striped",
      headStyles: { fillColor: [239, 68, 68] }
    });
  }
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }
  
  doc.save(`analytics_report_${timestamp}.pdf`);
};
