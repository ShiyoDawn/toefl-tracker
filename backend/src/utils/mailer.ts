import nodemailer from 'nodemailer';
import { env } from '../env.js';

function hasSmtpConfig() {
  return Boolean(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS && env.MAIL_FROM);
}

export async function sendRegisterCode(email: string, code: string) {
  if (!hasSmtpConfig()) {
    if (env.NODE_ENV !== 'production') {
      console.log(`[dev email] TOEFL Tracker register code for ${email}: ${code}`);
      return;
    }

    throw new Error('SMTP is not configured');
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: env.MAIL_FROM,
    to: email,
    subject: 'TOEFL Tracker 注册验证码',
    text: `你的 TOEFL Tracker 注册验证码是 ${code}，10 分钟内有效。`,
  });
}
