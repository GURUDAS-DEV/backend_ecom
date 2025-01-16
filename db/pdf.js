const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

async function heatshrinkpdf(quotationDetails) {
  const pdfsFolderPath = path.join(__dirname, 'pdfs'); // Ensure the folder exists
  if (!fs.existsSync(pdfsFolderPath)) {
    fs.mkdirSync(pdfsFolderPath);
  }

  const filePath = path.join(pdfsFolderPath, `quotation_${Date.now()}.pdf`);
   console.log(filePath)
   
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
    .text("Brand", 70, tableTop, { bold: true })
    .text("Technology", 140, tableTop, { bold: true })
    .text("Type", 220, tableTop, { bold: true })
    .text("Voltage (KV)", 270, tableTop, { bold: true })
    .text("Core", 340, tableTop, { bold: true })
    .text("Size (Sq.mm.)", 380, tableTop, { bold: true })
    .text("Cable Type", 440, tableTop, { bold: true })
    .text("Conductor", 500, tableTop, { bold: true })
    .text("HSN", 560, tableTop, { bold: true })
    .text("Qty", 600, tableTop, { bold: true })
    .text("Rate ₹", 640, tableTop, { bold: true })
    .text("Amount ₹", 700, tableTop, { bold: true })
    .text("Delivery", 770, tableTop, { bold: true })
    .text("Remark", 840, tableTop, { bold: true });

  doc.moveTo(50, tableTop + 15).lineTo(850, tableTop + 15).stroke();

  let yPos = tableTop + itemSpacing;

  quotationDetails.items.forEach((item, index) => {
    doc.fontSize(10)
      .text(index + 1, 50, yPos)
      .text(item.brand, 70, yPos)
      .text(item.technology, 140, yPos)
      .text(item.type, 220, yPos)
      .text(item.voltage, 270, yPos)
      .text(item.core, 340, yPos)
      .text(item.size, 380, yPos)
      .text(item.cableType, 440, yPos)
      .text(item.conductor, 500, yPos)
      .text(item.hsn, 560, yPos)
      .text(item.quantity, 600, yPos)
      .text(`₹${item.rate.toFixed(2)}`, 640, yPos)
      .text(`₹${(item.rate * item.quantity).toFixed(2)}`, 700, yPos)
      .text(item.delivery, 770, yPos)
      .text(item.remark, 840, yPos);

    yPos += itemSpacing;
  });

  const totalAmount = quotationDetails.items.reduce(
    (sum, item) => sum + item.rate * item.quantity,
    0
  );
  doc
    .fontSize(12)
    .text(`Total Amount: ₹${totalAmount.toFixed(2)}`, 700, yPos + 10, { bold: true });

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

  console.log(`PDF generated at: ${filePath}`);
  return true 
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