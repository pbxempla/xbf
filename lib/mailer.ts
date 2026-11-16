import nodemailer from "nodemailer";

export interface SendOtpEmailOptions {
  to: string;
  otp: string;
  type?: string;
}

/**
 * Sends a branded verification email with a 6-digit OTP code using company SMTP settings.
 * If SMTP configuration is missing, gracefully falls back to clear console logging for local development.
 */
export async function sendOtpEmail({ to, otp, type }: SendOtpEmailOptions): Promise<void> {
  const mailServer = process.env.XEMPLA_MAIL_SERVER?.trim();
  const mailPort = Number(process.env.XEMPLA_MAIL_PORT) || 587;
  const isSecure = process.env.XEMPLA_MAIL_SSL === "true";
  const useCredentials = process.env.XEMPLA_USE_CREDENTIALS === "true";
  const mailUsername = process.env.XEMPLA_MAIL_USERNAME?.trim();
  const mailPassword = process.env.XEMPLA_MAIL_PASSWORD?.trim();
  const mailFrom = process.env.XEMPLA_MAIL_FROM?.trim() || "Xempla Workspace <auth@xempla.com>";

  if (!mailServer || (useCredentials && (!mailUsername || !mailPassword))) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMTP server and required credentials must be configured in production.");
    }

    console.log("\n=======================================================");
    console.log("  [XEMPLA AUTH - OTP EMAIL DISPATCH (DEV FALLBACK)]");
    console.log(`  Recipient: ${to}`);
    console.log(`  Purpose:   ${type || "sign-in / verification"}`);
    console.log(`  Timestamp: ${new Date().toISOString()}`);
    console.log("  ---------------------------------------------------");
    console.log(`  >>> YOUR 6-DIGIT VERIFICATION CODE: [ ${otp} ] <<<`);
    console.log("  ---------------------------------------------------");
    console.log("  Notice: SMTP credentials empty. OTP logged for local testing.");
    console.log("=======================================================\n");
    return;
  }

  // Create Nodemailer transport with company SMTP settings
  const transporter = nodemailer.createTransport({
    host: mailServer,
    port: mailPort,
    secure: isSecure,
    auth:
      useCredentials && mailUsername && mailPassword
        ? {
            user: mailUsername,
            pass: mailPassword,
          }
        : undefined,
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === "production",
    },
  });

  const subject = `Your Xempla Verification Code: ${otp}`;
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body {
          margin: 0;
          padding: 32px 16px;
          background-color: #F8FAFC;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0F172A;
        }
        .container {
          max-width: 520px;
          margin: 0 auto;
          background-color: #FFFFFF;
          border-radius: 20px;
          border: 1px solid #E2E8F0;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
        }
        .header {
          background: linear-gradient(135deg, #1E1B4B 0%, #2563EB 100%);
          padding: 36px 32px;
          text-align: center;
        }
        .brand-title {
          margin: 0;
          font-size: 26px;
          font-weight: 800;
          color: #FFFFFF;
          letter-spacing: -0.5px;
        }
        .content {
          padding: 36px 32px;
          text-align: center;
        }
        .greeting {
          font-size: 16px;
          color: #334155;
          margin-bottom: 24px;
          line-height: 1.5;
        }
        .otp-display {
          display: inline-block;
          background-color: #EEF2FF;
          border: 2px dashed #6366F1;
          border-radius: 14px;
          padding: 16px 32px;
          font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
          font-size: 34px;
          font-weight: 800;
          letter-spacing: 8px;
          color: #312E81;
          margin: 12px 0 24px 0;
        }
        .security-notice {
          font-size: 13px;
          color: #64748B;
          line-height: 1.6;
          margin-top: 20px;
        }
        .footer {
          border-top: 1px solid #F1F5F9;
          padding: 24px 32px;
          text-align: center;
          font-size: 12px;
          color: #94A3B8;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="brand-title">XEMPLA</h1>
        </div>
        <div class="content">
          <p class="greeting">
            Welcome to <strong>Xempla Workspace</strong>. Enter the 6-digit one-time password below to sign in to your account:
          </p>
          <div class="otp-display">${otp}</div>
          <p class="security-notice">
            This verification code is valid for <strong>10 minutes</strong>. If you did not initiate this request, you can safely ignore this email.
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Xempla Technologies Inc. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: mailFrom,
    to,
    subject,
    html: htmlContent,
    text: `Your Xempla verification code is: ${otp}. It expires in 10 minutes.`,
  });
}
