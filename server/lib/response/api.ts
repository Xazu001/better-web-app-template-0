import { type MessageInput, resolveMessage } from "./messages";

export type ApiSuccess<T = unknown> = {
  success: true;
  result: T;
};

export type ApiError = {
  success: false;
  errors: Record<string, string>;
};

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

export function apiSuccess<T>(data: T): ApiSuccess<T> {
  return { success: true, result: data };
}

export function apiError(message: MessageInput): ApiError {
  return { success: false, errors: { general: resolveMessage(message) } };
}

export function apiValidationError(errors: Record<string, string>): ApiError {
  return { success: false, errors };
}
