// Email delivery via SMTP (Nodemailer). When mail is not configured (local dev,
// demo, tests) we fall back to a transport that logs the message — including the
// action link — to the console, so the full verify/reset flows are exercisable
// without a real SMTP server. Set MAIL_ENABLED=true plus the SMTP_* vars to send
// real email.
const nodemailer = require('nodemailer');
const config = require('../config');

let cachedTransport = null;

// A transport that "sends" by printing to the console. Returns a shape
// compatible with the subset of the Nodemailer API we use.
const consoleTransport = {
  sendMail(message) {
    const line = '─'.repeat(60);
    console.log(
      `\n${line}\n[mailer:dev] To: ${message.to}\nSubject: ${message.subject}\n\n${message.text}\n${line}\n`,
    );
    return Promise.resolve({ messageId: 'dev-console' });
  },
};

function transport() {
  if (cachedTransport) return cachedTransport;
  if (config.mail.enabled) {
    cachedTransport = nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      // 465 implies implicit TLS; other ports use STARTTLS upgrade.
      secure: config.mail.port === 465,
      auth: config.mail.user ? { user: config.mail.user, pass: config.mail.pass } : undefined,
    });
  } else {
    cachedTransport = consoleTransport;
  }
  return cachedTransport;
}

async function send({ to, subject, text, html }) {
  await transport().sendMail({ from: config.mail.from, to, subject, text, html });
}

// Minimal, dependency-free HTML wrapper. Email clients are unreliable with CSS,
// so this stays intentionally plain and always ships a text alternative.
const wrap = (heading, body, action, link) => `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a">
    <h1 style="font-size:20px;margin:0 0 16px">${heading}</h1>
    <p style="font-size:15px;line-height:1.5;margin:0 0 20px">${body}</p>
    <p style="margin:0 0 20px"><a href="${link}" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:15px">${action}</a></p>
    <p style="font-size:13px;color:#666;line-height:1.5;margin:0">If the button does not work, paste this link into your browser:<br>${link}</p>
  </div>`;

async function sendVerificationEmail(user, link, code) {
  const greeting = `Welcome to Bettereads${user.name ? `, ${user.name}` : ''}!`;
  await send({
    to: user.email,
    subject: 'Verify your Bettereads email',
    text: `${greeting}\n\nYour verification code is: ${code}\nEnter it on the site to confirm your email. This code expires in 5 minutes.\n\nOr open this link instead (valid for 24 hours):\n${link}\n\nIf you did not create an account, you can ignore this email.`,
    html: `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a">
    <h1 style="font-size:20px;margin:0 0 16px">Confirm your email</h1>
    <p style="font-size:15px;line-height:1.5;margin:0 0 16px">${greeting} Enter this code on the site to confirm your email:</p>
    <p style="margin:0 0 8px"><span style="display:inline-block;font-size:30px;font-weight:700;letter-spacing:8px;background:#f4f4f2;padding:12px 20px;border-radius:10px">${code}</span></p>
    <p style="font-size:13px;color:#666;line-height:1.5;margin:0 0 20px">This code expires in 5 minutes.</p>
    <p style="font-size:14px;line-height:1.5;margin:0 0 20px;color:#444">Or confirm with one click (link valid for 24 hours):</p>
    <p style="margin:0 0 20px"><a href="${link}" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:15px">Verify email</a></p>
    <p style="font-size:13px;color:#666;line-height:1.5;margin:0">If the button does not work, paste this link into your browser:<br>${link}</p>
  </div>`,
  });
}

async function sendPasswordResetEmail(user, link) {
  await send({
    to: user.email,
    subject: 'Reset your Bettereads password',
    text: `We received a request to reset your Bettereads password.\n\nReset it by opening this link:\n${link}\n\nThis link expires in 1 hour. If you did not request this, you can safely ignore this email — your password will not change.`,
    html: wrap(
      'Reset your password',
      'We received a request to reset your Bettereads password. This link expires in 1 hour. If you did not request this, you can ignore this email.',
      'Reset password',
      link,
    ),
  });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
