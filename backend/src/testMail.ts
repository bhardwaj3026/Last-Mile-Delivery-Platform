import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

async function testEmail() {
  console.log('🔍 Testing SMTP Email Configuration...');
  console.log('SMTP_HOST:', process.env.SMTP_HOST || 'Not set');
  console.log('SMTP_PORT:', process.env.SMTP_PORT || 'Not set');
  console.log('SMTP_USER:', process.env.SMTP_USER ? '*** Configured ***' : 'BLANK (Using Ethereal Fake Test Inbox)');
  console.log('SMTP_FROM:', process.env.SMTP_FROM || 'Not set');

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (user && user.trim() !== '') {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
      });

      console.log('📡 Verifying SMTP connection with provider...');
      await transporter.verify();
      console.log('✅ SMTP connection verified successfully!');

      console.log('✉️ Sending test email to user...');
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || user,
        to: user,
        subject: '[LastMile Test] Email Delivery Verification',
        text: 'Hello! This is a test email from your Last-Mile Delivery Tracker platform. Real inbox delivery is working!',
      });
      console.log('🎉 Email sent successfully! Message ID:', info.messageId);
    } catch (err: any) {
      console.error('❌ Real Email Sending Failed!');
      console.error('Error Code:', err.code);
      console.error('Error Response:', err.response || err.message);
    }
  } else {
    console.log('--------------------------------------------------');
    console.log('ℹ️ SMTP_USER is blank in backend/.env.');
    console.log('Emails are currently captured by Ethereal Test Inbox (preview links in terminal).');
    console.log('To receive real emails in your personal inbox, configure your Gmail App Password or SMTP provider in backend/.env!');
    console.log('--------------------------------------------------');
  }
}

testEmail();
