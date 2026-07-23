import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
  }

  async sendVerificationCode(email: string, code: string) {
    const mailOptions = {
      from: `"Sinh vien" <${process.env.MAIL_USER}>`,
      to: email,
      subject: 'Verification Code',
      text: `Your verification code is: ${code}. It will expire in 10 minutes.`,
      html: `<b>Your verification code is: ${code}</b><p>It will expire in 10 minutes.</p>`,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Verification code sent to ${email}`);
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  async sendRegistrationVerificationCode(email: string, code: string) {
    const mailOptions = {
      from: `"Sinh vien" <${process.env.MAIL_USER}>`,
      to: email,
      subject: 'Verification Code for Registration',
      text: `Your registration verification code is: ${code}. It will expire in 10 minutes.`,
      html: `<b>Your registration verification code is: ${code}</b><p>It will expire in 10 minutes.</p>`,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Registration verification code sent to ${email}`);
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Failed to send verification email');
    }
  }
}
