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

export interface SendAnalysisReadyEmailOptions {
  to: string;
  fileName: string;
  rows: number;
  link: string;
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * Tells a user their analysis has finished. Carries no analysis data, only the file name and a
 * link back to the app. Falls back to console logging when SMTP is not configured (dev).
 */
export async function sendAnalysisReadyEmail({
  to,
  fileName,
  rows,
  link,
}: SendAnalysisReadyEmailOptions): Promise<void> {
  const mailServer = process.env.XEMPLA_MAIL_SERVER?.trim();
  const useCredentials = process.env.XEMPLA_USE_CREDENTIALS === "true";
  const mailUsername = process.env.XEMPLA_MAIL_USERNAME?.trim();
  const mailPassword = process.env.XEMPLA_MAIL_PASSWORD?.trim();
  const mailFrom = process.env.XEMPLA_MAIL_FROM?.trim() || "Xempla Workspace <auth@xempla.com>";
  const subject = `Your analysis of ${fileName} is ready`;
  const text = `Your analysis of ${fileName} (${rows.toLocaleString()} work orders) is ready.\nOpen it: ${link}`;

  if (!mailServer || (useCredentials && (!mailUsername || !mailPassword))) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMTP server and required credentials must be configured in production.");
    }
    console.log("\n[XEMPLA - ANALYSIS READY EMAIL (DEV FALLBACK)]");
    console.log(`  Recipient: ${to}\n  Subject:   ${subject}\n  Link:      ${link}\n`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: mailServer,
    port: Number(process.env.XEMPLA_MAIL_PORT) || 587,
    secure: process.env.XEMPLA_MAIL_SSL === "true",
    auth: useCredentials && mailUsername && mailPassword ? { user: mailUsername, pass: mailPassword } : undefined,
    tls: { rejectUnauthorized: process.env.NODE_ENV === "production" },
  });

  const safeName = escapeHtml(fileName);
  await transporter.sendMail({
    from: mailFrom,
    to,
    subject,
    text,
    html: `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;color:#0F172A">
      <h1 style="font-size:20px;margin:0 0 12px">Your analysis is ready</h1>
      <p style="font-size:15px;line-height:1.6;color:#334155">We finished analysing <strong>${safeName}</strong> (${rows.toLocaleString()} work orders).</p>
      <p style="margin:24px 0"><a href="${escapeHtml(link)}" style="background:#000;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-size:14px;font-weight:600">Open in Xempla</a></p>
      <p style="font-size:12px;color:#94A3B8">You received this because you started an analysis in Xempla.</p>
    </div>`,
  });
}
