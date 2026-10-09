import { hashPassword } from "$/lib/crypto";
import { dataMethod, actionMethod } from "$/lib/decorators";
import { R2FileUploader } from "$/lib/utils/files";
import { R2_DIRECTORIES } from "@/constants";
import { Validator, UpdateUsernameSchema } from "@/validators";

import { BaseService, type FormErrors } from "../base";

/** Verification links stay valid for 24h — matches the unverified-user cleanup cron. */
const VERIFICATION_CODE_TTL_MS = 24 * 60 * 60 * 1000;

export class UserService extends BaseService {
  /**
   * Delete every row belonging to the user (logins, rights, then the user).
   * Keep the order — child tables first, the user row last.
   */
  public async deleteUserData(userId: string): Promise<void> {
    await this.exDbOperation(() =>
      this.db.op.deleteFrom("logins").where("user_id", "=", userId).execute()
    );

    await this.exDbOperation(() =>
      this.db.op.deleteFrom("user_rights").where("user_id", "=", userId).execute()
    );

    await this.exDbOperation(() =>
      this.db.op.deleteFrom("users").where("user_id", "=", userId).execute()
    );
  }

  @dataMethod()
  public async createUser(params: {
    username: string;
    email: string;
    password?: string;
    verified?: boolean;
    verificationCode?: string;
  }) {
    const { username, email, password, verified = false, verificationCode } = params;

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim().toLowerCase();

    const isBanned = await this.auth.isEmailBanned(normalizedEmail);
    if (isBanned) {
      return this.none();
    }

    const existingEmail = await this.exDbOperation(() =>
      this.db.op
        .selectFrom("logins")
        .where("login_email", "=", normalizedEmail)
        .select("login_id")
        .executeTakeFirst()
    );

    if (existingEmail) {
      return this.none();
    }

    const existingUsername = await this.exDbOperation(() =>
      this.db.op
        .selectFrom("users")
        .where("user_namespace", "=", normalizedUsername)
        .select("user_id")
        .executeTakeFirst()
    );

    if (existingUsername) {
      return this.none();
    }

    const userId = crypto.randomUUID();
    const hashedPassword = await hashPassword(password as string);

    await this.exDbBatchOperation([
      this.db.op
        .insertInto("users")
        .values({
          user_id: userId,
          user_name: username.trim(),
          user_namespace: normalizedUsername,
          user_verified: verified,
          user_created_on: Date.now()
        })
        .returningAll(),

      this.db.op
        .insertInto("logins")
        .values({
          user_id: userId,
          login_email: normalizedEmail,
          login_password: hashedPassword,
          login_verification_code: verificationCode,
          login_verification_code_expires_on: verificationCode
            ? Date.now() + VERIFICATION_CODE_TTL_MS
            : null,
          login_created_on: Date.now()
        })
        .returningAll(),

      this.db.op
        .insertInto("user_rights")
        .values({
          user_id: userId
        })
        .returningAll()
    ]);

    return this.ok({ userId });
  }

  @actionMethod({ general: "FAILED_TO_UPDATE_NAME" })
  public async updateName(userId: string, data: Record<string, unknown>) {
    const result = Validator.validateData(data, UpdateUsernameSchema);
    if (!Validator.isSuccess(result)) this.throw(result.errors as FormErrors);

    await this.exDbOperation(() =>
      this.db.op
        .updateTable("users")
        .set({ user_name: result.data.user_name })
        .where("user_id", "=", userId)
        .execute()
    );

    return this.formSuccess({ user_name: result.data.user_name });
  }

  /**
   * Upload a new avatar to R2 and queue deletion of the previous one —
   * the reference example of R2 + Queue working together.
   */
  @actionMethod({ general: "FAILED_TO_UPDATE_AVATAR" })
  public async updateAvatar(userId: string, file: File) {
    if (file.size === 0) {
      this.throw({ avatar: "NO_FILE_PROVIDED" });
    }

    if (file.type !== "image/webp") {
      this.throw({ avatar: "INVALID_FILE_TYPE_WEBP" });
    }

    if (file.size > 2 * 1024 * 1024) {
      this.throw({ avatar: "FILE_TOO_LARGE_2MB" });
    }

    const user = await this.exDbOperation(() =>
      this.db.op
        .selectFrom("users")
        .where("user_id", "=", userId)
        .select("user_avatar_source")
        .executeTakeFirst()
    );

    if (!user) {
      this.throw(this.responses.getNotFound("USER_NOT_FOUND"));
    }

    const oldAvatarSource = user.user_avatar_source;

    const fileUploader = new R2FileUploader(this.r2);
    const timestamp = Date.now();
    const fileName = `${userId}-${timestamp}.webp`;

    const uploadResult = await fileUploader.uploadSingle(file, {
      directory: R2_DIRECTORIES.avatars,
      customName: fileName,
      contentType: "image/webp"
    });

    if (!uploadResult.success) {
      console.error(`[UserService.updateAvatar] R2 upload failed:`, uploadResult.error);
      this.throw(this.responses.getBadRequest("UPLOAD_FAILED"));
    }

    if (oldAvatarSource) {
      try {
        await this.queue.send("delete-r2-objects", {
          keys: [`${R2_DIRECTORIES.avatars}/${oldAvatarSource}`]
        });
      } catch (error) {
        console.error("[updateAvatar] Failed to queue old avatar deletion:", error);
      }
    }

    await this.exDbOperation(() =>
      this.db.op
        .updateTable("users")
        .set({ user_avatar_source: fileName })
        .where("user_id", "=", userId)
        .execute()
    );

    return this.formSuccess({ user_avatar_source: fileName });
  }

  @actionMethod({ general: "FAILED_TO_DELETE_AVATAR" })
  public async deleteAvatar(userId: string) {
    const user = await this.exDbOperation(() =>
      this.db.op
        .selectFrom("users")
        .where("user_id", "=", userId)
        .select("user_avatar_source")
        .executeTakeFirst()
    );

    if (!user) {
      this.throw(this.responses.getNotFound("USER_NOT_FOUND"));
    }

    const oldAvatarSource = user.user_avatar_source;

    if (oldAvatarSource) {
      try {
        await this.queue.send("delete-r2-objects", {
          keys: [`${R2_DIRECTORIES.avatars}/${oldAvatarSource}`]
        });
      } catch (error) {
        console.error("[deleteAvatar] Failed to queue old avatar deletion:", error);
      }
    }

    await this.exDbOperation(() =>
      this.db.op
        .updateTable("users")
        .set({ user_avatar_source: null })
        .where("user_id", "=", userId)
        .execute()
    );

    return this.formSuccess({ user_avatar_source: null });
  }
}
