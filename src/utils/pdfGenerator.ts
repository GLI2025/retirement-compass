import jsPDF from 'jspdf';

export interface PDFExportData {
  results: {
    requiredSavings: number;
    projectedAtRetirement: number;
    gap: number;
    isOnTrack: boolean;
    checkpoints: {
      age: number;
      label: string;
      monthlyNeed: number;
      ssIncome: number;
      otherIncome: number;
      fromPortfolio: number;
      portfolioBalance: number;
      status: 'good' | 'warn' | 'bad';
    }[];
  };
  inputs: {
    currentAge: number;
    retirementAge: number;
    monthlyExpenses: number;
    currentSavings: number;
    monthlyContribution: number;
    employerContribution: number;
    investmentStrategy: string;
  };
  chartImage?: string;
}

const formatCurrency = (value: number): string => {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  return `$${Math.round(value).toLocaleString()}`;
};

export async function generateRetirementPDF(data: PDFExportData): Promise<Blob> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  // Header
  doc.setFontSize(24);
  doc.setTextColor(99, 102, 241); // Primary color
  doc.text('Retirement Savings Plan', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 10;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });

  // Summary Section
  yPosition += 20;
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('Summary', 20, yPosition);

  yPosition += 10;
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);

  // Input summary
  const inputLines = [
    `Current Age: ${data.inputs.currentAge} years`,
    `Retirement Age: ${data.inputs.retirementAge} years`,
    `Monthly Expenses: ${formatCurrency(data.inputs.monthlyExpenses)}`,
    `Current Savings: ${formatCurrency(data.inputs.currentSavings)}`,
    `Monthly Contribution: ${formatCurrency(data.inputs.monthlyContribution)} + ${formatCurrency(data.inputs.employerContribution)} employer match`,
    `Investment Strategy: ${data.inputs.investmentStrategy.charAt(0).toUpperCase() + data.inputs.investmentStrategy.slice(1)}`,
  ];

  inputLines.forEach(line => {
    doc.text(line, 20, yPosition);
    yPosition += 7;
  });

  // Results Section
  yPosition += 10;
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('Projection Results', 20, yPosition);

  yPosition += 10;
  doc.setFontSize(12);
  
  // Required Savings
  doc.setTextColor(60, 60, 60);
  doc.text('Required Savings at Retirement:', 20, yPosition);
  doc.setTextColor(0, 0, 0);
  doc.text(formatCurrency(data.results.requiredSavings), 100, yPosition);

  yPosition += 8;
  doc.setTextColor(60, 60, 60);
  doc.text('Projected Savings at Retirement:', 20, yPosition);
  doc.setTextColor(99, 102, 241);
  doc.text(formatCurrency(data.results.projectedAtRetirement), 100, yPosition);

  yPosition += 8;
  doc.setTextColor(60, 60, 60);
  doc.text(data.results.isOnTrack ? 'Surplus:' : 'Gap:', 20, yPosition);
  if (data.results.isOnTrack) {
    doc.setTextColor(34, 197, 94); // Green
    doc.text(`+${formatCurrency(Math.abs(data.results.gap))}`, 100, yPosition);
  } else {
    doc.setTextColor(234, 179, 8); // Yellow/Orange
    doc.text(`-${formatCurrency(Math.abs(data.results.gap))}`, 100, yPosition);
  }

  // Status badge
  yPosition += 15;
  doc.setFontSize(14);
  if (data.results.isOnTrack) {
    doc.setTextColor(34, 197, 94);
    doc.text('✓ You are on track for retirement!', 20, yPosition);
  } else {
    doc.setTextColor(234, 179, 8);
    doc.text('⚠ Additional savings needed to reach your goal', 20, yPosition);
  }

  // Chart Image
  if (data.chartImage) {
    yPosition += 15;
    try {
      doc.addImage(data.chartImage, 'PNG', 15, yPosition, pageWidth - 30, 70);
      yPosition += 80;
    } catch (e) {
      console.error('Failed to add chart image:', e);
      yPosition += 10;
    }
  }

  // Income Checkpoints
  if (data.results.checkpoints.length > 0) {
    // Check if we need a new page
    if (yPosition > 200) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Income Checkpoints', 20, yPosition);

    yPosition += 10;
    doc.setFontSize(9);
    
    // Table header
    doc.setTextColor(100, 100, 100);
    doc.text('Age', 20, yPosition);
    doc.text('Monthly Need', 45, yPosition);
    doc.text('SS Income', 80, yPosition);
    doc.text('Other Income', 110, yPosition);
    doc.text('From Portfolio', 145, yPosition);
    doc.text('Balance', 175, yPosition);

    yPosition += 2;
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 5;

    // Table rows
    doc.setTextColor(60, 60, 60);
    data.results.checkpoints.forEach(checkpoint => {
      if (yPosition > 280) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.text(`${checkpoint.age}`, 20, yPosition);
      doc.text(formatCurrency(checkpoint.monthlyNeed), 45, yPosition);
      doc.text(formatCurrency(checkpoint.ssIncome), 80, yPosition);
      doc.text(formatCurrency(checkpoint.otherIncome), 110, yPosition);
      doc.text(formatCurrency(checkpoint.fromPortfolio), 145, yPosition);
      doc.text(formatCurrency(checkpoint.portfolioBalance), 175, yPosition);
      yPosition += 7;
    });
  }

  // Footer/Disclaimer
  yPosition = doc.internal.pageSize.getHeight() - 30;
  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.text(
    'Disclaimer: This projection is for educational purposes only. Actual results may vary.',
    pageWidth / 2,
    yPosition,
    { align: 'center' }
  );
  doc.text(
    'Consult a qualified financial advisor before making investment decisions.',
    pageWidth / 2,
    yPosition + 5,
    { align: 'center' }
  );

  return doc.output('blob');
}
