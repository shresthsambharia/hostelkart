import nodemailer from 'nodemailer';

const sendEmail = async ({ to, subject, text, html }) => {
  try {
    // Read SMTP settings from environment variables or fallback to defaults
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT) || 465;
    const secure = port === 465; // true for 465, false for other ports
    const user = process.env.EMAIL_USER || 'supporthostelkart@gmail.com';
    const pass = process.env.EMAIL_PASS;

    if (!pass) {
      console.warn(`[Mail] EMAIL_PASS env variable is not set. Email to ${to} with subject "${subject}" was logged instead of sent.`);
      console.log(`[Mail Text]:\n${text}`);
      return { success: true, mock: true };
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });

    const mailOptions = {
      from: `"HostelKart" <${user}>`,
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Mail] Email successfully sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Mail Error] Failed to send email to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
};

export default sendEmail;
