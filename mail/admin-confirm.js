const nodemailer = require("nodemailer");
const path = require("path");
require("dotenv").config();  // works locally, ignored on Railway


//const SECRET_KEY = process.env.SECRET_KEY;

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_MAIL,
    pass: process.env.SMTP_PASSWORD,
  },
  logger: true, // Enable detailed logging
  debug: true, // Show debug output
});

async function otpSenderMail(email, subject, message) {
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
    otpSenderMail
  };