/**
 * @file utils/email.js
 * @description Email sending utility using Nodemailer.
 * This module configures a Nodemailer transporter to send emails using SMTP.
 * Configuration is primarily driven by environment variables.
 */

const nodemailer = require('nodemailer');
const logger = require('../utils/logger'); // Assuming logger is in the root utils directory

/**
 * @constant {object} transporter
 * @description Nodemailer transporter object.
 * Configured using SMTP settings from environment variables:
 * - EMAIL_HOST: SMTP server hostname.
 * - EMAIL_PORT: SMTP server port. Defaults to 587 (for TLS/STARTTLS).
 *               Port 465 is typically used for SSL.
 * - EMAIL_SECURE: If true, the connection will use TLS ( مستقیم SSL). Set to true for port 465.
 *                 If false (or not explicitly set for port 587), STARTTLS is used.
 *                 The logic `(process.env.EMAIL_PORT === '465')` sets secure to true only if port is 465.
 * - EMAIL_USER: Username for SMTP authentication.
 * - EMAIL_PASS: Password for SMTP authentication.
 *
 * The transporter is created once when the module is loaded and reused for all email sending.
 */
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587', 10), // Default to 587 for TLS
  secure: (process.env.EMAIL_PORT === '465'), // true for 465, false for other ports (implies STARTTLS for 587)
  auth: {
    user: process.env.EMAIL_USER, // SMTP username
    pass: process.env.EMAIL_PASS, // SMTP password
  },
});

/**
 * Sends an email using the pre-configured transporter.
 *
 * @async
 * @function sendEmail
 * @param {string} to Recipient's email address (e.g., "user@example.com" or "User <user@example.com>").
 * @param {string} subject Email subject line.
 * @param {string} text Plain text content of the email. This should be provided as an alternative to HTML.
 * @param {string} html HTML content of the email. Can include rich formatting.
 * @returns {Promise<boolean>} A promise that resolves to true if the email was sent successfully, 
 *                             or false if an error occurred.
 * @throws {Error} This function catches errors from `transporter.sendMail` and logs them.
 *                 It currently returns `false` on error but could be modified to rethrow
 *                 if the calling context needs to handle the error more specifically.
 *
 * @example
 * const success = await sendEmail(
 *   'jane.doe@example.com',
 *   'Welcome!',
 *   'Hello Jane, welcome to our platform!',
 *   '<h1>Hello Jane,</h1><p>Welcome to our platform!</p>'
 * );
 * if (success) {
 *   console.log('Email sent!');
 * } else {
 *   console.log('Failed to send email.');
 * }
 */
async function sendEmail(to, subject, text, html) {
  /**
   * @constant {object} mailOptions
   * @description Email message options.
   * Defines the sender, recipient(s), subject, and content of the email.
   * - from: Sender address, configured via `process.env.EMAIL_FROM`.
   *         Should be in the format "Sender Name <sender@example.com>".
   * - to: Recipient's email address.
   * - subject: Email subject.
   * - text: Plain text version of the email body.
   * - html: HTML version of the email body.
   */
  const mailOptions = {
    from: process.env.EMAIL_FROM, // Sender address (e.g., '"My App" <noreply@myapp.com>')
    to: to, // List of receivers (can be a comma-separated string for multiple addresses)
    subject: subject, // Subject line
    text: text, // Plain text body
    html: html, // HTML body
  };

  try {
    // Attempt to send the email
    await transporter.sendMail(mailOptions);
    // Log successful email sending
    logger.info(`Email sent successfully to ${to} with subject "${subject}"`);
    return true; // Indicate success
  } catch (error) {
    // Log the error if sending failed
    logger.error(`Error sending email to ${to} with subject "${subject}": ${error.message}`);
    // In a production application, you might want to:
    // - Rethrow the error to be handled by a more specialized error handler.
    // - Add more sophisticated retry logic for transient network issues.
    // - Queue the email for later retry.
    // For this implementation, it returns false to indicate failure.
    // throw error; 
    return false; // Indicate failure
  }
}

module.exports = { sendEmail };
