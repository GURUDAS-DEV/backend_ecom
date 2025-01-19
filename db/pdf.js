const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

async function heatshrinkpdf(quotationDetails) {
  const pdfsFolderPath = path.join(__dirname, 'pdfs'); // Ensure the folder exists
  if (!fs.existsSync(pdfsFolderPath)) {
    fs.mkdirSync(pdfsFolderPath);
  }

  const filePath = path.join(pdfsFolderPath, `quotation_${Date.now()}.pdf`);
  console.log(filePath);

  const doc = new PDFDocument({ margin: 50 });

  // Add background color
  doc.rect(0, 0, doc.page.width, doc.page.height).fill('#F4F4F4');

  // Header Section
  doc.rect(0, 0, doc.page.width, 250).fill('#B38E00');
  doc.image('logo.png', 50, 60, { width: 50 });

  doc
    .fillColor('black')
    .fontSize(12)
    .font('Helvetica-Bold')
    .text('SHETH TRADING CORPORATION', 110, 60, { align: 'left' })
    .moveDown(0.5)
    .font('Helvetica')
    .fontSize(10)
    .text('22, RABINDRA SARANI, SHOP NO. 322, GR. FLOOR,', 110)
    .text('KOLKATA-700073')
    .text('GSTIN: 19AALFS8359M1Z5')
    .text('MSME UDYAM REG NO.: WB-10-0039292')
    .text('CONTACT: 40240300/22379239')
    .text('E-MAIL: shethtrd@gmail.com');

  const rightStart = 400;
  doc
    .fontSize(12)
    .font('Helvetica-Bold')
    .text('BANK DETAIL', rightStart, 60, { align: 'left' })
    .moveDown(0.5)
    .font('Helvetica')
    .fontSize(10)
    .text('Bank Name: HDFC Bank Ltd.', rightStart)
    .text('Branch: India Exchange Place', rightStart)
    .text('A/c No.: 12422320004133', rightStart)
    .text('IFSC: HDFC0001242', rightStart);

  doc
    .fillColor('black')
    .fontSize(12)
    .font('Helvetica-Bold')
    .text('Quotation / Proforma Invoice', 0, 230, { align: 'center' });

  // Table Header
  const tableTop = 280;
  const itemSpacing = 20;

  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('Sl.', 50, tableTop)
    .text('Description', 70, tableTop)
    .text('Cable OD (MM)', 200, tableTop)
    .text('Cat No.', 290, tableTop)
    .text('HSN', 360, tableTop)
    .text('Qty.', 420, tableTop)
    .text('Rate ₹', 470, tableTop)
    .text('Amount ₹', 550, tableTop)
    .text('Delivery', 630, tableTop);

  doc.moveTo(50, tableTop + 15).lineTo(750, tableTop + 15).stroke();

  // Table Rows
  let yPos = tableTop + itemSpacing;

  quotationDetails.items.forEach((item, index) => {
    doc
      .fontSize(9)
      .font('Helvetica')
      .text(index + 1, 50, yPos)
      .text(item.description, 70, yPos)
      .text(item.cableOd, 200, yPos)
      .text(item.catNo, 290, yPos)
      .text(item.hsn, 360, yPos)
      .text(item.quantity, 420, yPos)
      .text(`₹${item.rate}`, 470, yPos)
      .text(`₹${(item.rate * item.quantity)}`, 550, yPos)
      .text(item.delivery, 630, yPos);

    yPos += itemSpacing;
  });

  // Summary Section
  const totalAmount = quotationDetails.items.reduce(
    (sum, item) => sum + item.rate * item.quantity,
    0
  );

  yPos += 10;
  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('Total', 470, yPos)
    .text(`₹${totalAmount.toFixed(2)}`, 550, yPos, { align: 'right' });

  yPos += itemSpacing;
  doc
    .fontSize(10)
    .font('Helvetica')
    .text('Add: Delivery Charge', 470, yPos)
    .text('₹---', 550, yPos, { align: 'right' });

  yPos += itemSpacing;
  doc
    .fontSize(10)
    .font('Helvetica')
    .text('Add: GST @ 18%', 470, yPos)
    .text(`₹${(totalAmount * 0.18).toFixed(2)}`, 550, yPos, { align: 'right' });

  yPos += itemSpacing;
  doc
    .fontSize(12)
    .font('Helvetica-Bold')
    .text('TOTAL', 470, yPos)
    .text(`₹${(totalAmount * 1.18).toFixed(2)}`, 550, yPos, { align: 'right' });

  // Footer Section
  yPos += 30;
  doc
    .fontSize(10)
    .font('Helvetica')
    .text('Brand:', 50, yPos)
    .text('Delivery:', 200, yPos)
    .text('As Stated Above on Ex godown Kolkata Basis', 250, yPos)
    .moveDown(0.5)
    .text('GST: Extra @ 18%', 50, yPos + 20)
    .text('Payment:', 50, yPos + 40)
    .text('Validity: 7 Days', 50, yPos + 60);

  // Save PDF
  doc.pipe(fs.createWriteStream(filePath));
  doc.end();

  console.log(`PDF generated at: ${filePath}`);
  return true;
}


 async function dowellspdf(quotationDetails, filePath) {
  const doc = new PDFDocument({ margin: 50 });

  doc
    .image("logo.png", 50, 45, { width: 50 }) 
    .fontSize(20)
    .text("Sheth Trading Corporation", 110, 57)
    .fontSize(10)
    .text("22, RABINDRA SARANI, SHOP NO. 322, GR. FLOOR,", 200, 65, { align: "left" })
    .text("Kolkata, West Bengal, 700073", 200, 80, { align: "left" })
    .text("Phone: 40240300/22379239", 200, 95, { align: "left" })
    .text("Email: enquiry@shethtrading.com", 200, 110, { align: "left" })
    .text("Bank Details", 200, 80, { align: "right" })
    .text("Bank Name: HDFC BANK LTD", 200, 80, { align: "right" })
    .text("Branch:  India Exchange Place", 200, 80, { align: "right" })
    .text("A/c No. : 12422320004133", 200, 80, { align: "right" })
    .text("IFSC :  HDFC0001242", 200, 80, { align: "right" })
    .moveDown();

  const tableTop = 200;
  const itemSpacing = 20;

  doc.fontSize(12)
    .text("Sl", 50, tableTop, { bold: true })
    .text("Description", 70, tableTop, { bold: true })
    .text("Cable OD (mm)", 220, tableTop, { bold: true })
    .text("Cat. No.", 300, tableTop, { bold: true })
    .text("HSN", 380, tableTop, { bold: true })
    .text("Qty.", 440, tableTop, { bold: true })
    .text("Rate ₹", 500, tableTop, { bold: true })
    .text("Discount", 560, tableTop, { bold: true })
    .text("Amount ₹", 620, tableTop, { bold: true })
    .text("Delivery", 700, tableTop, { bold: true });

  doc.moveTo(50, tableTop + 15).lineTo(850, tableTop + 15).stroke(); 

  let yPos = tableTop + itemSpacing;

  quotationDetails.items.forEach((item, index) => {
    const discountedAmount = item.rate * item.quantity * (1 - (item.discount || 0) / 100);

    doc.fontSize(10)
      .text(index + 1, 50, yPos) 
      .text(item.description, 70, yPos) 
      .text(item.cableOd, 220, yPos) 
      .text(item.catNo, 300, yPos) 
      .text(item.hsn, 380, yPos) 
      .text(item.quantity, 440, yPos) 
      .text(`₹${item.rate.toFixed(2)}`, 500, yPos) 
      .text(`${item.discount || 0}%`, 560, yPos) 
      .text(`₹${discountedAmount.toFixed(2)}`, 620, yPos) 
      .text(item.delivery, 700, yPos); 

    yPos += itemSpacing;
  });

  const totalAmount = quotationDetails.items.reduce(
    (sum, item) => sum + item.rate * item.quantity * (1 - (item.discount || 0) / 100),
    0
  );
  doc
    .fontSize(12)
    .text(`Total Amount: ₹${totalAmount.toFixed(2)}`, 620, yPos + 10, { bold: true });

  doc
    .fontSize(10)
    .text(
      "Thank you for your business! If you have any questions about this quotation, please contact us.",
      50,
      700,
      { align: "center", width: 500 }
    );

  doc.pipe(fs.createWriteStream(filePath));
  doc.end();
}

async function Rest3M(quotationDetails, filePath) {
  const doc = new PDFDocument({ margin: 50 });

  doc
    .image("logo.png", 50, 45, { width: 50 }) 
    .fontSize(20)
    .text("Sheth Trading Corporation", 110, 57)
    .fontSize(10)
    .text("22, RABINDRA SARANI, SHOP NO. 322, GR. FLOOR,", 200, 65, { align: "left" })
    .text("Kolkata, West Bengal, 700073", 200, 80, { align: "left" })
    .text("Phone: 40240300/22379239", 200, 95, { align: "left" })
    .text("Email: enquiry@shethtrading.com", 200, 110, { align: "left" })
    .text("Bank Details", 200, 80, { align: "right" })
    .text("Bank Name: HDFC BANK LTD", 200, 80, { align: "right" })
    .text("Branch:  India Exchange Place", 200, 80, { align: "right" })
    .text("A/c No. : 12422320004133", 200, 80, { align: "right" })
    .text("IFSC :  HDFC0001242", 200, 80, { align: "right" })
    .moveDown();

  const tableTop = 200;
  const itemSpacing = 20;

  doc.fontSize(12)
    .text("Sl", 50, tableTop, { bold: true })
    .text("Description", 70, tableTop, { bold: true })
    .text("HSN", 300, tableTop, { bold: true })
    .text("Qty.", 380, tableTop, { bold: true })
    .text("Rate ₹", 440, tableTop, { bold: true })
    .text("Sum ₹", 500, tableTop, { bold: true })
    .text("Delivery", 620, tableTop, { bold: true });

  doc.moveTo(50, tableTop + 15).lineTo(850, tableTop + 15).stroke(); 

  let yPos = tableTop + itemSpacing;

  quotationDetails.items.forEach((item, index) => {
    const sum = item.rate * item.quantity;

    doc.fontSize(10)
      .text(index + 1, 50, yPos) 
      .text(item.description, 70, yPos) 
      .text(item.hsn, 300, yPos) 
      .text(item.quantity, 380, yPos) 
      .text(`₹${item.rate.toFixed(2)}`, 440, yPos) 
      .text(`₹${sum.toFixed(2)}`, 500, yPos) 
      .text(item.delivery, 620, yPos); 

    yPos += itemSpacing;
  });

  const totalAmount = quotationDetails.items.reduce(
    (sum, item) => sum + item.rate * item.quantity,
    0
  );
  doc
    .fontSize(12)
    .text(`Total Amount: ₹${totalAmount.toFixed(2)}`, 500, yPos + 10, { bold: true });

  doc
    .fontSize(10)
    .text(
      "Thank you for your business! If you have any questions about this quotation, please contact us.",
      50,
      700,
      { align: "center", width: 500 }
    );

  doc.pipe(fs.createWriteStream(filePath));
  doc.end();
}


module.exports = {heatshrinkpdf, dowellspdf, Rest3M}