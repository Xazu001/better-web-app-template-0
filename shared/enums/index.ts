export const UserStatus = {
  ACTIVE: "active",
  BANNED: "banned"
} as const;

export type UserStatusType = (typeof UserStatus)[keyof typeof UserStatus];

export const USER_STATUS_VALUES = Object.values(UserStatus) as [string, ...string[]];
