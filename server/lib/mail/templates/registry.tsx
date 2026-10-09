import { ConfirmRegistration } from "./confirm-registration";

/** @jsxImportSource react */
import type * as React from "react";

// Mail types that have templates (excludes MainLayout which is just a wrapper)
export type MailTemplateType = "ConfirmRegistration";

export interface MailTemplateConfig<T extends Record<string, unknown>> {
  name: string;
  description: string;
  component: (props: T) => React.ReactElement;
  previewProps: T;
}

export const mailTemplateRegistry = {
  ConfirmRegistration: {
    name: "Confirm Registration",
    description: "Email sent after user registration to verify email address",
    component: ConfirmRegistration,
    previewProps: {
      userName: "Jan Kowalski",
      verificationCode: "abc123-def456-ghi789"
    }
  }
} as const satisfies Record<MailTemplateType, MailTemplateConfig<any>>;

export type MailTemplateKey = keyof typeof mailTemplateRegistry;

export const mailTemplateKeys = Object.keys(mailTemplateRegistry) as MailTemplateKey[];

export function getMailTemplate<T extends MailTemplateKey>(
  key: T
): (typeof mailTemplateRegistry)[T] {
  return mailTemplateRegistry[key];
}
