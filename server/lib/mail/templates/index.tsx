/** @jsxImportSource react */
export { MainLayout, vars } from "./layout";
export { ConfirmRegistration } from "./confirm-registration";
export { styles } from "./styles";
export {
  getMailTemplate,
  mailTemplateKeys,
  mailTemplateRegistry,
  type MailTemplateConfig,
  type MailTemplateKey,
  type MailTemplateType
} from "./registry";

export type MailType = "ConfirmRegistration" | "MainLayout";
