
const nodemailer = require('nodemailer');

// Validate email configuration and throw clear error if missing
function validateEmailConfig() {
  const missing = [];
  if (!process.env.EMAIL_HOST) missing.push('EMAIL_HOST');
  if (!process.env.EMAIL_USER) missing.push('EMAIL_USER');
  if (!process.env.EMAIL_APP_PASSWORD) missing.push('EMAIL_APP_PASSWORD');

  if (missing.length > 0) {
    const error = new Error(
      `Email service is not configured. Missing required environment variables: ${missing.join(', ')}`
    );
    error.code = 'ECONFIG_MISSING';
    throw error;
  }
}

function createTransporter() {
  validateEmailConfig();

  const port = parseInt(process.env.EMAIL_PORT || '465', 10);
  const isSecure =
    process.env.EMAIL_SECURE !== undefined
      ? process.env.EMAIL_SECURE === 'true'
      : port === 465;

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port,
    secure: isSecure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD
    },
    // Explicit timeouts prevent indefinite hangs on unresponsive IPs
    connectionTimeout: 10000, // 10s
    greetingTimeout: 10000,   // 10s
    socketTimeout: 15000      // 15s
  });
}

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
}

// Reset cached transporter (e.g. if configuration changes or connection becomes invalid)
function resetTransporter() {
  transporter = null;
}

async function verifyTransporter() {
  validateEmailConfig();
  const t = createTransporter();
  await t.verify();
}

/**
 * Execute an email operation with retry logic.
 * Retries on transient network/connection timeouts (ETIMEDOUT, ESOCKET, ECONNRESET, etc.)
 * by creating a fresh connection on each attempt.
 */
async function sendWithRetry(operation, maxRetries = 3, baseDelay = 1000) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const activeTransporter = createTransporter();
      return await operation(activeTransporter);
    } catch (error) {
      lastError = error;
      const isTransient =
        error &&
        (
          error.code === 'ETIMEDOUT' ||
          error.code === 'ESOCKET' ||
          error.code === 'ECONNRESET' ||
          error.code === 'ECONNABORTED' ||
          error.code === 'EDNS' ||
          error.message?.includes('Connection timeout')
        );

      if (isTransient && attempt < maxRetries) {
        console.warn(
          `[Email] Attempt ${attempt} failed with ${error.code || error.message}. Retrying in ${baseDelay * attempt}ms...`
        );
        await new Promise(resolve => setTimeout(resolve, baseDelay * attempt));
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

async function sendEmail({ to, subject, text, html, attachments }) {
  validateEmailConfig();

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
    html,
    attachments
  };

  return await sendWithRetry(async (t) => {
    return await t.sendMail(mailOptions);
  }, 3, 1000);
}

function generateReportFilename(reportType, dateRange) {
  const timestamp = new Date().toISOString().split('T')[0];
  const safeType = reportType.toLowerCase().replace(/\s+/g, '_');
  return `RMKStockMate_${safeType}_${dateRange || timestamp}.pdf`;
}

module.exports = {
  validateEmailConfig,
  createTransporter,
  getTransporter,
  resetTransporter,
  verifyTransporter,
  sendEmail,
  generateReportFilename
};
