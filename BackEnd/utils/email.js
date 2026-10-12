const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '465'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
      }
    });
  }
  return transporter;
}

async function verifyTransporter() {
  const t = getTransporter();
  await t.verify();
}

async function sendEmail({ to, subject, text, html, attachments }) {
  const t = getTransporter();
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
    html,
    attachments
  };

  return await t.sendMail(mailOptions);
}

function generateReportFilename(reportType, dateRange) {
  const timestamp = new Date().toISOString().split('T')[0];
  const safeType = reportType.toLowerCase().replace(/\s+/g, '_');
  return `RMKStockMate_${safeType}_${dateRange || timestamp}.pdf`;
}

module.exports = {
  getTransporter,
  verifyTransporter,
  sendEmail,
  generateReportFilename
};