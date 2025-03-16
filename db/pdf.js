const puppeteer = require('puppeteer');
const Handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');

Handlebars.registerHelper('multiply', function(a, b) {
  return a * b;
});

// Configure AWS SDK
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

async function heatshrinkpdf(quotationDetails, payment, validity, cart_id) {
  try {
    // Load HTML template
    const templatePath = path.join(__dirname, 'templates', 'invoice-template.handlebars');
    const templateHtml = fs.readFileSync(templatePath, 'utf8');
    
    // Compile template
    const template = Handlebars.compile(templateHtml);
    
    // Calculate totals
    const totalAmount = quotationDetails.items.reduce(
      (sum, item) => sum + item.rate * item.quantity,
      0
    );
    const gstAmount = totalAmount * 0.18;
    const grandTotal = totalAmount + gstAmount;
    
    // Render HTML with data
    const context = {
      quotationDetails,
      payment,
      validity,
      totalAmount: totalAmount.toFixed(2),
      gstAmount: gstAmount.toFixed(2),
      grandTotal: grandTotal.toFixed(2),
      currentDate: new Date().toLocaleDateString()
    };
    
    const html = template(context);
    
    // Launch headless browser
    const browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    
    // Set content and configure page
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.addStyleTag({
      content: `
        @page {
          size: A4;
          margin: 0;
        }
        body {
          margin: 1.5cm;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        td, th {
          padding: 8px;
          border: 1px solid #ddd;
        }
        .text-right {
          text-align: right;
        }
        .header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
        }
      `
    });
    
    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });
    
    await browser.close();
    
    // Upload to S3
    const randomThreeDigit = Math.floor(100 + Math.random() * 900);
    const s3Key = `quotations/invoice_${cart_id}_${randomThreeDigit}.pdf`;
    
    const uploadParams = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
    };
    
    const s3Response = await s3.upload(uploadParams).promise();
    console.log(`PDF uploaded successfully: ${s3Response.Location}`);
    return s3Response.Location;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}


module.exports = {heatshrinkpdf}