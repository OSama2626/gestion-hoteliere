// Mock nodemailer
const mockSendMail = jest.fn();
const mockCreateTransport = jest.fn().mockReturnValue({
  sendMail: mockSendMail,
});
jest.mock('nodemailer', () => ({
  createTransport: mockCreateTransport,
}));

const { sendEmail } = require('../../utils/email');
const logger = require('../../utils/logger');

// Spy on logger methods
jest.spyOn(logger, 'info').mockImplementation(() => {});
jest.spyOn(logger, 'error').mockImplementation(() => {});

describe('Email Utility (sendEmail)', () => {
  beforeEach(() => {
    // Clear mocks before each test
    mockCreateTransport.mockClear();
    mockSendMail.mockClear();
    logger.info.mockClear();
    logger.error.mockClear();

    // Setup default environment variables for email
    process.env.EMAIL_HOST = 'smtp.test.com';
    process.env.EMAIL_PORT = '587';
    process.env.EMAIL_USER = 'testuser';
    process.env.EMAIL_PASS = 'testpass';
    process.env.EMAIL_FROM = '"Test App" <noreply@testapp.com>';
  });

  const testEmailData = {
    to: 'recipient@example.com',
    subject: 'Test Subject',
    text: 'Test plain text content',
    html: '<p>Test HTML content</p>',
  };

  it('should successfully send an email and log info', async () => {
    mockSendMail.mockResolvedValueOnce({ messageId: 'test-message-id' }); // sendMail in nodemailer returns a promise

    const result = await sendEmail(
      testEmailData.to,
      testEmailData.subject,
      testEmailData.text,
      testEmailData.html
    );

    expect(result).toBe(true);
    expect(mockCreateTransport).toHaveBeenCalledTimes(1);
    expect(mockCreateTransport).toHaveBeenCalledWith({
      host: process.env.EMAIL_HOST,
      port: 587, // Parsed from '587'
      secure: false, // Because port is '587'
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(mockSendMail).toHaveBeenCalledWith({
      from: process.env.EMAIL_FROM,
      to: testEmailData.to,
      subject: testEmailData.subject,
      text: testEmailData.text,
      html: testEmailData.html,
    });

    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(
      `Email sent successfully to ${testEmailData.to} with subject "${testEmailData.subject}"`
    );
    expect(logger.error).not.toHaveBeenCalled();
  });
  
  it('should correctly set secure to true if EMAIL_PORT is 465', async () => {
    process.env.EMAIL_PORT = '465';
    mockSendMail.mockResolvedValueOnce({ messageId: 'test-message-id-secure' });

    await sendEmail(
      testEmailData.to,
      testEmailData.subject,
      testEmailData.text,
      testEmailData.html
    );
    
    expect(mockCreateTransport).toHaveBeenCalledWith(expect.objectContaining({
      port: 465,
      secure: true, 
    }));
  });


  it('should return false and log error when sendMail fails', async () => {
    const smtpError = new Error('SMTP Error');
    mockSendMail.mockRejectedValueOnce(smtpError);

    const result = await sendEmail(
      testEmailData.to,
      testEmailData.subject,
      testEmailData.text,
      testEmailData.html
    );

    expect(result).toBe(false);
    expect(mockCreateTransport).toHaveBeenCalledTimes(1); // Transporter is still created
    expect(mockSendMail).toHaveBeenCalledTimes(1); // sendMail is still called

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      `Error sending email to ${testEmailData.to} with subject "${testEmailData.subject}": ${smtpError.message}`
    );
    expect(logger.info).not.toHaveBeenCalled();
  });
});
