import enServerErrors from "@/locales/en_server_errors.json";
import { type MessageKey, type SerializedMessageKey, isMessageKey } from "@/utils/messages";

export type ServerMessageKey = keyof typeof enServerErrors;

export const messages = enServerErrors;
export { isMessageKey, type MessageKey, type SerializedMessageKey };

export function getMessage(key: ServerMessageKey): string {
  return messages[key];
}

export type MessageInput =
  | string
  | SerializedMessageKey
  | { general?: string }
  | Record<string, any>;

export function resolveMessage(message?: MessageInput): string {
  if (!message) return "";
  if (typeof message === "object" && message !== null) {
    if ("general" in message && typeof message.general === "string") {
      return message.general;
    }
  }
  return typeof message === "string" ? message : "";
}
