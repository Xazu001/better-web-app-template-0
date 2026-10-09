import * as React from "react";
import * as ReactDOMServer from "react-dom/server";

import { MAIL_FROM_EMAIL, MAIL_FROM_NAME } from "@/constants";

import * as Mails from "./templates";

import type { MailType } from "./templates";

const templateComponents: Record<MailType, React.ComponentType<any>> = {
  ConfirmRegistration: Mails.ConfirmRegistration,
  MainLayout: Mails.MainLayout
};

export interface MailConfig<T extends MailType = MailType> {
  template: T;
  props?: T extends "ConfirmRegistration"
    ? { userName: string; verificationCode: string }
    : Record<string, any>;
}

export interface RenderedMail<T extends MailType = MailType> {
  html: string;
  props: any;
  template: T;
  changeProps(newProps: any): string;
  getProps(): any;
}

export class MailProvider {
  private email: SendEmail;

  constructor(email: SendEmail) {
    this.email = email;
  }

  static generatePreviews(): string {
    const previews = [
      {
        name: "ConfirmRegistration",
        description: "Email sent after user registration",
        component: React.createElement(Mails.ConfirmRegistration, {
          userName: "Jan Kowalski",
          verificationCode: "123456"
        })
      }
    ];

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Email Previews</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .preview { margin-bottom: 40px; border: 1px solid #ccc; padding: 20px; }
            .preview h2 { margin-top: 0; }
          </style>
        </head>
        <body>
          <h1>Email Previews</h1>
          ${previews
            .map(
              (preview) => `
            <div class="preview">
              <h2>${preview.name}</h2>
              <p>${preview.description}</p>
              <div style="border: 1px solid #ddd; padding: 20px; background: #f9f9f9;">
                ${ReactDOMServer.renderToString(preview.component)}
              </div>
            </div>
          `
            )
            .join("")}
        </body>
      </html>
    `;
  }

  async generateMail<T extends MailType>(config: MailConfig<T>): Promise<RenderedMail<T>> {
    const { template, props = {} } = config;

    const TemplateComponent = templateComponents[template];
    if (!TemplateComponent) {
      throw new Error(`Email template '${template}' not found`);
    }

    const emailComponent = React.createElement(TemplateComponent, props as any);

    return {
      html: ReactDOMServer.renderToString(emailComponent),
      props: { ...props } as any,
      template,

      changeProps: (newProps: any) => {
        const mergedProps = { ...props, ...newProps };
        const updatedComponent = React.createElement(TemplateComponent, mergedProps as any);
        return ReactDOMServer.renderToString(updatedComponent);
      },

      getProps: () => ({ ...props }) as any
    };
  }

  async sendEmail(emailParams: {
    to: { email: string; name?: string }[];
    subject: string;
    html: string;
  }): Promise<void> {
    await this.email.send({
      from: { email: MAIL_FROM_EMAIL, name: MAIL_FROM_NAME },
      to: emailParams.to.map((recipient) =>
        recipient.name ? { email: recipient.email, name: recipient.name } : recipient.email
      ),
      subject: emailParams.subject,
      html: emailParams.html
    });
  }

  async generateAndSend<T extends MailType>(
    config: MailConfig<T>,
    recipientEmail: string,
    subject: string
  ): Promise<void> {
    const mailContent = await this.generateMail(config);

    await this.sendEmail({
      to: [{ email: recipientEmail }],
      subject,
      html: mailContent.html
    });
  }
}
