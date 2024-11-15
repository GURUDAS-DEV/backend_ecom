const nodemailer = require("nodemailer");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { Pool } = require("pg"); 


require("dotenv").config({ path: path.join(__dirname, "../.env") });
const pool = new Pool({
    connectionString: process.env.DB_CONNECTION_STRING  
});

async function executeQuery(query, values = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(query, values);
    return result.rows;
  } finally {
    client.release();
  }
}

async function detailOrder(user_id) {
          
    const orderQuery = 'SELECT * FROM cart_details WHERE user_id = $1;';
    const orderResults = await executeQuery(orderQuery, [user_id]);
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_PORT == 465, 
  auth: {
    user: process.env.SMTP_MAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

async function enquirySenderMail(user_id) {
  const details = detailOrder(user_id); 
  const subject = "Order Enquiry Sent";
  const message = `We have received your order enquiry of ${details} and we will look into it and notify you at the earliest with an update.`;
  
  
  const mailOptions = {
    from: process.env.SMTP_MAIL,
    to: email,
    subject: subject,
    text: message,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Error sending email notification");
  }
}

module.exports = {
  enquirySenderMail
};
