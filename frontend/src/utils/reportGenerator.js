import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generatePDFReport = (profile, insights, feedbackList) => {
  const doc = new jsPDF();
  
  // Custom brand colors
  const primaryColor = [74, 43, 142]; // #4a2b8e
  const successColor = [16, 185, 129]; // #10b981
  const warningColor = [245, 158, 11]; // #f59e0b
  const errorColor = [239, 68, 68]; // #ef4444

  let yPos = 20;

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...primaryColor);
  doc.text('FeedbackPulse Analytics Report', 14, yPos);
  yPos += 10;

  // Subtitle / Profile Info
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text(`Department: ${profile?.department || 'N/A'} | Year: ${profile?.year || 'N/A'}`, 14, yPos);
  yPos += 6;
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, yPos);
  yPos += 15;

  // Satisfaction Score Banner
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, yPos, 182, 25, 3, 3, 'FD');

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Overall Satisfaction Score:', 20, yPos + 16);

  const score = insights?.satisfaction_score || 0;
  let scoreColor = warningColor;
  if (score >= 70) scoreColor = successColor;
  if (score < 40) scoreColor = errorColor;

  doc.setFontSize(18);
  doc.setTextColor(...scoreColor);
  doc.text(`${score}%`, 90, yPos + 16);

  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`Total Feedback: ${feedbackList?.length || 0}`, 140, yPos + 16);
  yPos += 35;

  // AI Insights Section
  if (insights?.ai_powered) {
    doc.setFontSize(16);
    doc.setTextColor(...primaryColor);
    doc.text('AI-Powered Insights', 14, yPos);
    yPos += 8;

    // Summary
    if (insights.ai_summary) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('Executive Summary:', 14, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      const splitSummary = doc.splitTextToSize(insights.ai_summary, 180);
      doc.text(splitSummary, 14, yPos);
      yPos += splitSummary.length * 6 + 4;
    }

    // Helper for lists
    const drawListSection = (title, items, icon) => {
      if (!items || items.length === 0) return;
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`${icon} ${title}`, 14, yPos);
      yPos += 6;
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      items.forEach(item => {
        const splitText = doc.splitTextToSize(`• ${item}`, 175);
        if (yPos + (splitText.length * 5) > 280) {
           doc.addPage();
           yPos = 20;
        }
        doc.text(splitText, 18, yPos);
        yPos += splitText.length * 5 + 2;
      });
      yPos += 4;
    };

    // Remove emojis from PDF output if they cause issues with jspdf standard fonts
    // Alternative: use text hyphens instead of emojis to avoid missing characters
    drawListSection('Key Strengths', insights.ai_strengths, '+');
    drawListSection('Areas for Improvement', insights.ai_improvements, '-');
    drawListSection('Actionable Suggestions', insights.ai_suggestions, '>');
  }

  // Feedback Table
  if (yPos > 230) {
    doc.addPage();
    yPos = 20;
  } else {
    yPos += 10;
  }

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('Comprehensive Feedback Log', 14, yPos);
  yPos += 5;

  const tableData = feedbackList?.map(f => [
    new Date(f.created_at).toLocaleDateString(),
    f.subjects?.name || 'Unknown',
    f.staff?.name || 'N/A',
    f.sentiment_label || 'Neutral',
    f.feedback_text
  ]) || [];

  doc.autoTable({
    startY: yPos,
    head: [['Date', 'Subject', 'Staff', 'Sentiment', 'Feedback']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255 },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 30 },
      2: { cellWidth: 30 },
      3: { cellWidth: 25, fontStyle: 'bold' },
      4: { cellWidth: 'auto' }
    },
    styles: { fontSize: 9, cellPadding: 3, font: 'helvetica' },
    didParseCell: function (data) {
      if (data.section === 'body' && data.column.index === 3) {
        const sentiment = data.cell.raw;
        if (sentiment === 'Positive') {
          data.cell.styles.textColor = successColor;
        } else if (sentiment === 'Negative') {
          data.cell.styles.textColor = errorColor;
        } else {
          data.cell.styles.textColor = warningColor;
        }
      }
    }
  });

  doc.save(`FeedbackPulse_Report_${profile?.department || 'Dept'}.pdf`);
};
