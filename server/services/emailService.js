const nodemailer = require("nodemailer");
const crypto = require("crypto");

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "localhost",
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    this.defaultFrom = process.env.SMTP_FROM || "noreply@kpanel.local";
  }

  // Check if email service is configured
  isConfigured() {
    return !!(
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    );
  }

  // Test email configuration
  async testConnection() {
    try {
      await this.transporter.verify();
      console.log("✅ Email service connected successfully");
      return true;
    } catch (error) {
      console.error("❌ Email service connection failed:", error.message);
      return false;
    }
  }

  // Generate secure token
  generateToken() {
    return crypto.randomBytes(32).toString("hex");
  }

  // Send email verification
  async sendVerificationEmail(email, token, userInfo = {}) {
    const verificationUrl = `${
      process.env.CLIENT_URL
    }/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

    const mailOptions = {
      from: this.defaultFrom,
      to: email,
      subject: "Verify Your KPanel Account",
      html: this.getVerificationEmailTemplate(verificationUrl, userInfo),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Verification email sent to ${email}`);
      return true;
    } catch (error) {
      console.error(
        `❌ Failed to send verification email to ${email}:`,
        error.message
      );
      return false;
    }
  }

  // Send password reset email
  async sendPasswordResetEmail(email, token, userInfo = {}) {
    const resetUrl = `${
      process.env.CLIENT_URL
    }/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    const mailOptions = {
      from: this.defaultFrom,
      to: email,
      subject: "Reset Your KPanel Password",
      html: this.getPasswordResetEmailTemplate(resetUrl, userInfo),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Password reset email sent to ${email}`);
      return true;
    } catch (error) {
      console.error(
        `❌ Failed to send password reset email to ${email}:`,
        error.message
      );
      return false;
    }
  }

  // Send welcome email
  async sendWelcomeEmail(email, userInfo = {}) {
    const loginUrl = `${process.env.CLIENT_URL}/login`;

    const mailOptions = {
      from: this.defaultFrom,
      to: email,
      subject: "Welcome to KPanel!",
      html: this.getWelcomeEmailTemplate(loginUrl, userInfo),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Welcome email sent to ${email}`);
      return true;
    } catch (error) {
      console.error(
        `❌ Failed to send welcome email to ${email}:`,
        error.message
      );
      return false;
    }
  }

  // Send security alert
  async sendSecurityAlert(email, alertType, details = {}) {
    const mailOptions = {
      from: this.defaultFrom,
      to: email,
      subject: `KPanel Security Alert: ${alertType}`,
      html: this.getSecurityAlertTemplate(alertType, details),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Security alert sent to ${email}`);
      return true;
    } catch (error) {
      console.error(
        `❌ Failed to send security alert to ${email}:`,
        error.message
      );
      return false;
    }
  }

  // Email templates
  getVerificationEmailTemplate(verificationUrl, userInfo = {}) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - KPanel</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>KPanel</h1>
                <h2>Verify Your Email Address</h2>
            </div>
            <div class="content">
                <p>Hello ${userInfo.first_name || "there"},</p>
                <p>Thank you for registering with KPanel! To complete your account setup, please verify your email address by clicking the button below:</p>
                <p style="text-align: center;">
                    <a href="${verificationUrl}" class="button">Verify Email Address</a>
                </p>
                <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px;">${verificationUrl}</p>
                <p><strong>Important:</strong> This verification link will expire in 24 hours for security reasons.</p>
                <p>If you didn't create a KPanel account, please ignore this email.</p>
            </div>
            <div class="footer">
                <p>&copy; 2025 KPanel. All rights reserved.</p>
                <p>This is an automated message, please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  getPasswordResetEmailTemplate(resetUrl, userInfo = {}) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password - KPanel</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .alert { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>KPanel</h1>
                <h2>Password Reset Request</h2>
            </div>
            <div class="content">
                <p>Hello ${userInfo.first_name || "there"},</p>
                <p>We received a request to reset your password for your KPanel account. If you made this request, click the button below to reset your password:</p>
                <p style="text-align: center;">
                    <a href="${resetUrl}" class="button">Reset Password</a>
                </p>
                <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px;">${resetUrl}</p>
                <div class="alert">
                    <strong>Security Notice:</strong>
                    <ul>
                        <li>This password reset link will expire in 1 hour</li>
                        <li>If you didn't request this reset, please ignore this email</li>
                        <li>For security, consider changing your password regularly</li>
                    </ul>
                </div>
                <p>If you continue to have problems, please contact our support team.</p>
            </div>
            <div class="footer">
                <p>&copy; 2025 KPanel. All rights reserved.</p>
                <p>This is an automated message, please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  getWelcomeEmailTemplate(loginUrl, userInfo = {}) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to KPanel!</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .feature-box { background: white; border-left: 4px solid #667eea; padding: 15px; margin: 15px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to KPanel!</h1>
                <p>Your hosting control panel is ready</p>
            </div>
            <div class="content">
                <p>Hello ${userInfo.first_name || "there"},</p>
                <p>Welcome to KPanel! Your account has been successfully created and verified. You now have access to our powerful hosting control panel.</p>
                
                <div class="feature-box">
                    <h3>🚀 What you can do with KPanel:</h3>
                    <ul>
                        <li>Manage your domains and subdomains</li>
                        <li>Create and manage databases</li>
                        <li>Upload and manage files</li>
                        <li>Set up email accounts</li>
                        <li>Monitor resource usage</li>
                        <li>Configure SSL certificates</li>
                    </ul>
                </div>

                <p style="text-align: center;">
                    <a href="${loginUrl}" class="button">Access Your Control Panel</a>
                </p>

                <div class="feature-box">
                    <h3>📞 Need Help?</h3>
                    <p>Our support team is here to help you get started. Check out our documentation or contact support if you have any questions.</p>
                </div>
            </div>
            <div class="footer">
                <p>&copy; 2025 KPanel. All rights reserved.</p>
                <p>This is an automated message, please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  getSecurityAlertTemplate(alertType, details = {}) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Security Alert - KPanel</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc3545; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .alert-box { background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔒 Security Alert</h1>
                <h2>${alertType}</h2>
            </div>
            <div class="content">
                <div class="alert-box">
                    <p><strong>Alert Details:</strong></p>
                    <ul>
                        <li><strong>Time:</strong> ${
                          details.timestamp || new Date().toLocaleString()
                        }</li>
                        <li><strong>IP Address:</strong> ${
                          details.ip_address || "Unknown"
                        }</li>
                        <li><strong>User Agent:</strong> ${
                          details.user_agent || "Unknown"
                        }</li>
                        ${
                          details.location
                            ? `<li><strong>Location:</strong> ${details.location}</li>`
                            : ""
                        }
                    </ul>
                </div>
                <p>If this was you, no action is required. If you don't recognize this activity, please:</p>
                <ul>
                    <li>Change your password immediately</li>
                    <li>Review your account activity</li>
                    <li>Contact our support team</li>
                </ul>
            </div>
            <div class="footer">
                <p>&copy; 2025 KPanel. All rights reserved.</p>
                <p>This is an automated security message.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }
}

module.exports = new EmailService();
