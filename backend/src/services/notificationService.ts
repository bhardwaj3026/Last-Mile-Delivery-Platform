import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';

export type NotificationEvent =
  | 'ORDER_CREATED'
  | 'ORDER_ASSIGNED'
  | 'STATUS_CHANGE'
  | 'ORDER_FAILED'
  | 'ORDER_RESCHEDULED'
  | 'ORDER_DELIVERED';

export interface NotificationPayload {
  orderId: string;
  recipientEmail: string;
  recipientPhone?: string;
  event: NotificationEvent;
  status: string;
  details?: string;
}

export class NotificationService {
  private prisma: PrismaClient;
  private transporter: nodemailer.Transporter | null = null;
  private isTestAccount = false;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  private async getTransporter(): Promise<nodemailer.Transporter | null> {
    if (this.transporter) return this.transporter;

    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    // 1. If valid user credentials (not mock) are provided in .env
    if (host && user && !user.includes('mock_user') && user.trim() !== '') {
      try {
        this.transporter = nodemailer.createTransport({
          host,
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          secure: process.env.SMTP_PORT === '465',
          auth: { user, pass },
        });
        return this.transporter;
      } catch (err) {
        console.error('[NotificationService] Custom SMTP initialization error:', err);
      }
    }

    // 2. Auto-create Ethereal Test Account for zero-config live email preview links
    try {
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      this.isTestAccount = true;
      console.log(`✉️  Ethereal Test SMTP active for local dev. Inbox: ${testAccount.user}`);
      return this.transporter;
    } catch (err) {
      console.log('⚠️ Could not generate Ethereal test account, using console logging fallback.');
      return null;
    }
  }

  public async send(payload: NotificationPayload): Promise<void> {
    const subject = this.formatSubject(payload.event, payload.orderId, payload.status);
    const textBody = this.formatBody(payload);

    let emailStatus = 'SENT';
    let previewUrl: string | false = false;

    // 1. Email Channel
    try {
      const transporter = await this.getTransporter();

      if (transporter && payload.recipientEmail) {
        const info = await transporter.sendMail({
          from: process.env.SMTP_FROM || '"LastMile Logistics" <no-reply@lastmile.com>',
          to: payload.recipientEmail,
          subject,
          text: textBody,
        });

        previewUrl = nodemailer.getTestMessageUrl(info);

        console.log(`\n======================================================`);
        console.log(`✉️  EMAIL NOTIFICATION SENT TO: ${payload.recipientEmail}`);
        console.log(`📌 SUBJECT: ${subject}`);
        if (previewUrl) {
          console.log(`🔗 LIVE EMAIL INBOX PREVIEW LINK: ${previewUrl}`);
        }
        console.log(`======================================================\n`);
      } else {
        console.log(`[Email Output] To: ${payload.recipientEmail} | Subject: ${subject}\n${textBody}`);
      }
    } catch (err: any) {
      console.error(`[EmailChannel Error] Failed sending email to ${payload.recipientEmail}:`, err?.message);
      emailStatus = 'FAILED';
    }

    // Write to NotificationLog database table
    try {
      const logSubject = previewUrl ? `${subject} (Preview: ${previewUrl})` : subject;
      await this.prisma.notificationLog.create({
        data: {
          orderId: payload.orderId,
          channel: 'EMAIL',
          toAddress: payload.recipientEmail || 'N/A',
          subject: logSubject,
          status: emailStatus,
        },
      });
    } catch (dbErr) {
      console.error('[NotificationService] Failed to write NotificationLog:', dbErr);
    }

    // 2. SMS Channel (Mock/Stub logging)
    if (payload.recipientPhone) {
      console.log(`📱 [SMS Channel] To: ${payload.recipientPhone} | Msg: ${subject}`);
      try {
        await this.prisma.notificationLog.create({
          data: {
            orderId: payload.orderId,
            channel: 'SMS',
            toAddress: payload.recipientPhone,
            subject,
            status: 'SENT',
          },
        });
      } catch (dbErr) {
        // silent catch
      }
    }
  }

  private formatSubject(event: NotificationEvent, orderId: string, status: string): string {
    const shortId = orderId.substring(0, 8).toUpperCase();
    switch (event) {
      case 'ORDER_CREATED':
        return `[LastMile] Order #${shortId} Created & Confirmed`;
      case 'ORDER_ASSIGNED':
        return `[LastMile] Order #${shortId} Assigned to Delivery Agent`;
      case 'ORDER_FAILED':
        return `[LastMile] ATTENTION: Delivery Attempt Failed for Order #${shortId}`;
      case 'ORDER_RESCHEDULED':
        return `[LastMile] Order #${shortId} Rescheduled Successfully`;
      case 'ORDER_DELIVERED':
        return `[LastMile] Order #${shortId} Delivered Successfully!`;
      default:
        return `[LastMile] Order #${shortId} Status Updated: ${status}`;
    }
  }

  private formatBody(payload: NotificationPayload): string {
    const shortId = payload.orderId.substring(0, 8).toUpperCase();
    return `Hello,\n\nYour delivery order #${shortId} status is now: ${payload.status}.\n${
      payload.details ? `Details: ${payload.details}\n` : ''
    }\nTrack your package live on our portal.\n\nThank you for choosing LastMile Logistics.`;
  }
}
