import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

@Injectable()
export class MailService {
  constructor(private readonly config: ConfigService) {}

  async sendMail(input: SendMailInput) {
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    if (!user || !pass) {
      throw new Error('SMTP_USER and SMTP_PASS must be configured before email can be sent.');
    }

    const transporter = nodemailer.createTransport({
      host: this.config.getOrThrow<string>('SMTP_HOST'),
      port: this.config.getOrThrow<number>('SMTP_PORT'),
      secure: this.config.getOrThrow<boolean>('SMTP_SECURE'),
      auth: {
        user,
        pass,
      },
    });

    return transporter.sendMail({
      from: this.config.getOrThrow<string>('SMTP_FROM'),
      ...input,
    });
  }
}
