import "server-only";
import nodemailer from "nodemailer";

function smtpConfigured(): boolean {
  const user = process.env.SMTP_USER?.trim() || process.env.EMAIL?.trim();
  const pass = process.env.SMTP_PASS?.trim() || process.env.EMAIL_PASS?.trim();
  return Boolean(user && pass);
}

export function isMailConfigured(): boolean {
  return smtpConfigured();
}

export async function sendPasswordResetOtpEmail(to: string, otp: string): Promise<void> {
  const host = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER?.trim() || process.env.EMAIL?.trim();
  const pass = process.env.SMTP_PASS?.trim() || process.env.EMAIL_PASS?.trim();
  if (!user || !pass) {
    throw new Error("MAIL_NOT_CONFIGURED");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const from =
    process.env.EMAIL_FROM?.trim() ||
    `LAAS24 <${user}>`;

  await transporter.sendMail({
    from,
    to,
    subject: "Reset your password — verification code",
    text: `Your verification code is ${otp}. It expires in 10 minutes. If you did not request this, ignore this email.`,
    html: `<p>Your verification code is:</p><h2 style="letter-spacing:0.25em;font-family:monospace">${otp}</h2><p>This code expires in <strong>10 minutes</strong>.</p><p>If you did not request a password reset, you can ignore this message.</p>`,
  });
}
