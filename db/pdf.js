const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');

// Configure AWS SDK
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

async function heatshrinkpdf(quotationDetails, payment, validity, cart_id) {
  /*const pdfsFolderPath = path.join(__dirname, 'pdfs'); // Ensure the folder exists
  if (!fs.existsSync(pdfsFolderPath)) {
    fs.mkdirSync(pdfsFolderPath);
  }

  const filePath = path.join(pdfsFolderPath, `quotation_${Date.now()}.pdf`);
*/
  const doc = new PDFDocument({ margin: 50 });

  // Add background color
  doc.rect(0, 0, doc.page.width, doc.page.height)

  // Header Section
  doc.rect(0, 0, doc.page.width, 250);
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
      .text("85469090", 360, yPos)
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

  // Footer Section with Payment and Validity
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
    .text(payment || '---', 120, yPos + 40) // Dynamic Payment
    .text('Validity:', 50, yPos + 60)
    .text(validity || '---', 120, yPos + 60); // Dynamic Validity

    const pdfBuffer = await new Promise((resolve, reject) => {
      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);
      doc.end();
    });
    const randomThreeDigit = Math.floor(100 + Math.random() * 900);
    const s3Key = `quotations/hs_${cart_id}_quotation_${randomThreeDigit}.pdf`;
  
    const uploadParams = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
    };
  
    try {
      const s3Response = await s3.upload(uploadParams).promise();
      console.log(`PDF uploaded successfully: ${s3Response.Location}`);
      return s3Response.Location; // Return the URL or key of the uploaded PDF
    } catch (error) {
      console.error('Error uploading to S3:', error);
      throw error;
    }
}

async function dowellspdf(quotationDetails, payment, cart_id) {
  const doc = new PDFDocument({ margin: 50 });
  
  // Header Section
  doc.rect(0, 0, doc.page.width, doc.page.height);

  // Header Section
  doc.rect(0, 0, doc.page.width, 250);
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

  // Table Header
  const tableTop = 180;
  const columnWidths = [40, 160, 80, 80, 60, 50, 70, 70, 70];
  const startX = 50;

  const drawRow = (y, rowData, isHeader = false) => {
    doc.fontSize(10).font(isHeader ? "Helvetica-Bold" : "Helvetica");

    let x = startX;
    rowData.forEach((text, i) => {
      doc.text(text, x, y, { width: columnWidths[i], align: "center" });
      x += columnWidths[i];
    });

    doc.moveTo(startX, y + 15).lineTo(startX + columnWidths.reduce((a, b) => a + b), y + 15).stroke();
  };

  // Draw table header
  drawRow(tableTop, ["Sl", "Description", "Cable OD (mm)", "Cat. No.", "HSN", "Qty.", "Rate ₹", "Discount", "Amount ₹"], true);

  let yPos = tableTop + 20;

  // Draw table rows
  quotationDetails.items.forEach((item, index) => {
    const discountedAmount = item.rate * item.quantity * (1 - (item.discount || 0) / 100);
    drawRow(yPos, [
      index + 1,
      item.description,
      item.cableOd,
      item.catNo,
      item.hsn,
      item.quantity,
      `₹${item.rate}`,
      `${item.discount || 0}%`,
      `₹${discountedAmount}`
    ]);

    yPos += 20;
  });

  // Summary Section
  const totalAmount = quotationDetails.items.reduce(
    (sum, item) => sum + item.rate * item.quantity * (1 - (item.discount || 0) / 100),
    0
  );

  doc
    .fontSize(12)
    .text(`Total Amount: ₹${totalAmount.toFixed(2)}`, startX + 500, yPos + 10, { bold: true });

  yPos += 40;

  // Payment and Validity Section
  doc
    .fontSize(10)
    .text("Payment:", startX, yPos)
    .text(payment || "N/A", startX + 70, yPos)
    .text("Validity:", startX + 250, yPos)
    .text("7 days validity" || "N/A", startX + 300, yPos);

  yPos += 40;

  // Footer Section
  doc
    .fontSize(10)
    .text(
      "Thank you for your business! If you have any questions about this quotation, please contact us.",
      startX,
      700,
      { align: "center", width: 500 }
    );

  const pdfBuffer = await new Promise((resolve, reject) => {
    const buffers = [];
    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);
    doc.end();
  });

  const randomThreeDigit = Math.floor(100 + Math.random() * 900);
  const s3Key = `quotations/dowells_${cart_id}_quotation_${randomThreeDigit}.pdf`;

  const uploadParams = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: s3Key,
    Body: pdfBuffer,
    ContentType: "application/pdf",
  };

  try {
    const s3Response = await s3.upload(uploadParams).promise();
    console.log(`PDF uploaded successfully: ${s3Response.Location}`);
    return s3Response.Location; // Return the URL or key of the uploaded PDF
  } catch (error) {
    console.error("Error uploading to S3:", error);
    throw error;
  }
}

async function Rest3M(quotationDetails, payment, validity, cart_id) {
  const doc = new PDFDocument({ margin: 50 });
  const pdfBuffer = await new Promise((resolve, reject) => {
    const buffers = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Header Section
    doc.rect(0, 0, doc.page.width, 120).fill('#f0f0f0');
    doc.image('logo.png', 70, 30, { width: 50 });
    doc.fillColor('black').fontSize(14).font('Helvetica-Bold')
      .text('SHETH TRADING CORPORATION', 130, 30)
      .font('Helvetica').fontSize(10)
      .text('22, RABINDRA SARANI, SHOP NO. 322, GR. FLOOR, KOLKATA-700073', 130, 50)
      .text('GSTIN: 19AALFS8359M1Z5', 130, 65)
      .text('MSME UDYAM REG NO.: WB-10-0039292', 130, 80)
      .text('CONTACT: 40240300/22379239', 130, 95)
      .text('E-MAIL: shethtrd@gmail.com', 130, 110);
    
    // Bank Details
    const rightStart = 450;
    doc.fontSize(12).font('Helvetica-Bold')
      .text('BANK DETAILS', rightStart, 30)
      .font('Helvetica').fontSize(10)
      .text('Bank Name: HDFC Bank Ltd.', rightStart, 50)
      .text('Branch: India Exchange Place', rightStart, 65)
      .text('A/c No.: 12422320004133', rightStart, 80)
      .text('IFSC: HDFC0001242', rightStart, 95);
    
    // Table Header
    const tableTop = 150;
    const columnWidths = [30, 200, 70, 50, 80, 80, 100];
    const xStart = 40;
    const yIncrement = 25;

    doc.moveTo(xStart, tableTop).lineTo(550, tableTop).stroke();
    doc.font('Helvetica-Bold').fontSize(10)
      .text('Sl', xStart, tableTop + 5, { width: columnWidths[0], align: 'center' })
      .text('Description', xStart + columnWidths[0], tableTop + 5, { width: columnWidths[1] })
      .text('HSN', xStart + columnWidths[0] + columnWidths[1] - 10, tableTop + 5, { width: columnWidths[2], align: 'center' })
      .text('Qty.', xStart + columnWidths[0] + columnWidths[1] + columnWidths[2] - 10, tableTop + 5, { width: columnWidths[3], align: 'center' })
      .text('Rate ₹', xStart + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3] - 10, tableTop + 5, { width: columnWidths[4], align: 'right' })
      .text('Sum ₹', xStart + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3] + columnWidths[4] - 10, tableTop + 5, { width: columnWidths[5], align: 'right' })
      .text('Delivery', xStart + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3] + columnWidths[4] + columnWidths[5] - 10, tableTop + 5, { width: columnWidths[6], align: 'center' });
    doc.moveTo(xStart, tableTop + 20).lineTo(550, tableTop + 20).stroke();

    let yPos = tableTop + yIncrement;
    doc.font('Helvetica').fontSize(10);

    quotationDetails.items.forEach((item, index) => {
      const sum = item.rate * item.quantity;
      doc.text(index + 1, xStart, yPos, { width: columnWidths[0], align: 'center' })
        .text(item.description, xStart + columnWidths[0], yPos, { width: columnWidths[1] })
        .text('85469090', xStart + columnWidths[0] + columnWidths[1] - 10, yPos, { width: columnWidths[2], align: 'center' })
        .text(item.quantity, xStart + columnWidths[0] + columnWidths[1] + columnWidths[2] - 10, yPos, { width: columnWidths[3], align: 'center' })
        .text(`₹${item.rate}`, xStart + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3] - 10, yPos, { width: columnWidths[4], align: 'right' })
        .text(`₹${sum}`, xStart + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3] + columnWidths[4] - 10, yPos, { width: columnWidths[5], align: 'right' })
        .text(item.delivery, xStart + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3] + columnWidths[4] + columnWidths[5] - 10, yPos, { width: columnWidths[6], align: 'center' });
      yPos += yIncrement;
    });

    const totalAmount = quotationDetails.items.reduce((sum, item) => sum + item.rate * item.quantity, 0);
    doc.fontSize(12).font('Helvetica-Bold').text(`Total Amount: ₹${totalAmount.toFixed(2)}`, 50, yPos + 40);

    doc.fontSize(10).text(`Payment: ${payment || 'N/A'}`, 50, yPos + 40).text(`Validity: ${validity || 'N/A'}`, 300, yPos + 40);

    doc.text("Thank you for your business!", 50, 700, { align: 'center', width: 500 });
    doc.end();
  });

  const randomThreeDigit = Math.floor(100 + Math.random() * 900);
  const s3Key = `quotations/rest3m_${cart_id}_quotation_${randomThreeDigit}.pdf`;
  const uploadParams = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: s3Key,
    Body: pdfBuffer,
    ContentType: 'application/pdf',
  };

  try {
    const s3Response = await s3.upload(uploadParams).promise();
    console.log(`PDF uploaded successfully: ${s3Response.Location}`);
    return s3Response.Location;
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw error;
  }
}


module.exports = {heatshrinkpdf, dowellspdf, Rest3M}