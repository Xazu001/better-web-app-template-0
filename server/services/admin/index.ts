import { dataMethod, actionMethod } from "$/lib/decorators";

import { BaseService } from "../base";

import type { Tables } from "$/database/tables";
import type { UserStatusType } from "@/enums";
import type { ExpressionBuilder } from "kysely";

export type AdminUserDetail = {
  user_id: string;
  user_name: string;
  user_namespace: string;
  user_verified: boolean;
  user_status: string;
  user_created_on: number | null;
  user_avatar_source: string | null;
  login_email: string | null;
  rights: {
    user_admin: boolean;
  };
};

export type AdminStats = {
  users: {
    total: number;
    verified: number;
    active: number;
    banned: number;
  };
  admins: number;
};

export type AdminUserRights = {
  userId: string;
  userName: string;
  rights: {
    admin: boolean;
  };
};

export class AdminService extends BaseService {
  /**
   * Authenticate AND authorize the requester as admin. Every public admin
   * method calls this — layout-loader guards alone don't protect direct
   * requests to actions/loaders (they are standalone HTTP endpoints).
   */
  private async requireAdminUser() {
    const requestingUser = await this.auth.getUserFromRequest();

    if (!requestingUser) {
      this.throw(this.responses.getUnauthorized("AUTHENTICATION_REQUIRED"));
    }

    // user_admin comes from the user_rights join in getUserFromRequest —
    // no second query needed.
    if (requestingUser.user_admin !== 1) {
      this.throw(this.responses.getNoAccess("ADMIN_ACCESS_REQUIRED"));
    }

    return requestingUser;
  }

  @dataMethod()
  public async isUserAdmin(userId: string): Promise<boolean> {
    try {
      const rights = await this.exDbOperation(() =>
        this.db.op
          .selectFrom("user_rights")
          .select("user_admin")
          .where("user_id", "=", userId)
          .executeTakeFirst()
      );

      return rights?.user_admin === 1;
    } catch (error) {
      console.error("[AdminService] Failed to check admin status:", error);
      return false;
    }
  }

  @actionMethod({ general: "FAILED_TO_DELETE_USER" })
  public async deleteUser(userId: string) {
    const requestingUser = await this.requireAdminUser();

    if (requestingUser.user_id === userId) {
      this.throw(this.responses.getBadRequest("CANNOT_DELETE_OWN_ACCOUNT_ADMIN"));
    }

    const user = await this.exDbOperation(() =>
      this.db.op
        .selectFrom("users")
        .select(["user_id", "user_name", "user_status"])
        .where("user_id", "=", userId)
        .executeTakeFirst()
    );

    if (!user) {
      this.throw(this.responses.getNotFound("USER_NOT_FOUND"));
    }

    await this.user.deleteUserData(userId);

    return this.formSuccess({
      deleted: true,
      userId
    });
  }

  /**
   * Mark the user as banned and block their login email from future registration.
   */
  @actionMethod({ general: "FAILED_TO_BAN_USER" })
  public async banUser(userId: string, reason?: string) {
    const requestingUser = await this.requireAdminUser();

    if (requestingUser.user_id === userId) {
      this.throw(this.responses.getBadRequest("CANNOT_DELETE_OWN_ACCOUNT_ADMIN"));
    }

    const user = await this.exDbOperation(() =>
      this.db.op
        .selectFrom("users")
        .select(["user_id", "user_name", "user_status"])
        .where("user_id", "=", userId)
        .executeTakeFirst()
    );

    if (!user) {
      this.throw(this.responses.getNotFound("USER_NOT_FOUND"));
    }

    const userLogin = await this.exDbOperation(() =>
      this.db.op
        .selectFrom("logins")
        .select(["login_email"])
        .where("user_id", "=", userId)
        .executeTakeFirst()
    );

    const emailsToBan = Array.from(
      new Set(
        [userLogin?.login_email]
          .filter((e): e is string => Boolean(e && e.trim()))
          .map((e) => e.trim().toLowerCase())
      )
    );

    const now = Date.now();
    const banReason = reason?.trim() || "Banned by administrator";

    for (const email of emailsToBan) {
      await this.exDbOperation(() =>
        this.db.op
          .insertInto("banned_emails")
          .values({
            email,
            reason: banReason,
            banned_by: requestingUser.user_id,
            banned_at: now
          })
          .onConflict((oc) =>
            oc.column("email").doUpdateSet({
              reason: banReason,
              banned_by: requestingUser.user_id,
              banned_at: now
            })
          )
          .execute()
      );
    }

    await this.exDbOperation(() =>
      this.db.op
        .updateTable("users")
        .set({ user_status: "banned" })
        .where("user_id", "=", userId)
        .execute()
    );

    return this.formSuccess({
      banned: true,
      userId,
      emailsBanned: emailsToBan
    });
  }

  @actionMethod({ general: "FAILED_TO_UPDATE_USER_RIGHTS" })
  public async grantRights(userId: string, rights: { admin?: boolean }) {
    const requestingUser = await this.requireAdminUser();

    if (requestingUser.user_id === userId && rights.admin === false) {
      this.throw(this.responses.getBadRequest("CANNOT_REVOKE_OWN_ADMIN"));
    }

    const user = await this.exDbOperation(() =>
      this.db.op
        .selectFrom("users")
        .select(["user_id", "user_name"])
        .where("user_id", "=", userId)
        .executeTakeFirst()
    );

    if (!user) {
      this.throw(this.responses.getNotFound("USER_NOT_FOUND"));
    }

    const existing = await this.exDbOperation(() =>
      this.db.op
        .selectFrom("user_rights")
        .select(["user_right_id", "user_admin"])
        .where("user_id", "=", userId)
        .executeTakeFirst()
    );

    const nextAdmin = rights.admin ?? Boolean(existing?.user_admin);

    if (existing) {
      await this.exDbOperation(() =>
        this.db.op
          .updateTable("user_rights")
          .set({
            user_admin: nextAdmin
          })
          .where("user_id", "=", userId)
          .execute()
      );
    } else {
      await this.exDbOperation(() =>
        this.db.op
          .insertInto("user_rights")
          .values({
            user_id: userId,
            user_admin: nextAdmin
          })
          .execute()
      );
    }

    return this.formSuccess({
      userId,
      userName: user.user_name,
      rights: {
        admin: nextAdmin
      }
    });
  }

  @dataMethod()
  public async getUsers(options?: {
    limit?: number;
    offset?: number;
    status?: UserStatusType;
    search?: string;
    sort?: "asc" | "desc";
  }) {
    await this.requireAdminUser();

    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;
    const search = options?.search?.trim();
    const like = `%${search}%`;

    const applySearch = (eb: ExpressionBuilder<Tables, "users">) =>
      eb.or([
        eb("users.user_name", "like", like),
        eb("users.user_namespace", "like", like),
        eb.exists(
          eb
            .selectFrom("logins")
            .select("logins.user_id")
            .whereRef("logins.user_id", "=", "users.user_id")
            .where("logins.login_email", "like", like)
        )
      ]);

    const buildQuery = () => {
      let query = this.db.op
        .selectFrom("users")
        .select([
          "users.user_id",
          "users.user_name",
          "users.user_namespace",
          "users.user_verified",
          "users.user_status",
          "users.user_created_on as created_on"
        ]);

      if (search) {
        query = query.where(applySearch);
      }

      if (options?.status) {
        query = query.where("users.user_status", "=", options.status);
      }

      if (options?.sort) {
        query = query.orderBy("users.user_created_on", options.sort);
      }

      return query.limit(limit).offset(offset);
    };

    const users = await this.exDbOperation(() => buildQuery().execute());

    const countResult = await this.exDbOperation(() => {
      let query = this.db.op.selectFrom("users").select((eb) => eb.fn.count("user_id").as("count"));

      if (search) {
        query = query.where(applySearch);
      }

      if (options?.status) {
        query = query.where("users.user_status", "=", options.status);
      }

      return query.executeTakeFirst();
    });

    return this.ok({
      users,
      total: Number(countResult?.count ?? 0),
      search: search ?? null,
      sort: options?.sort ?? null
    });
  }

  @dataMethod()
  public async getStats(): Promise<AdminStats> {
    await this.requireAdminUser();

    const countWhere = async (
      table: "users" | "user_rights",
      column: string,
      where?: [string, string, unknown]
    ) => {
      const row = await this.exDbOperation(() => {
        let query = this.db.op
          .selectFrom(table)
          .select((eb) => eb.fn.count(column as any).as("count"));
        if (where) {
          query = query.where(where[0] as any, where[1] as any, where[2]);
        }
        return query.executeTakeFirst();
      });
      return Number(row?.count ?? 0);
    };

    const [total, verified, active, banned, admins] = await Promise.all([
      countWhere("users", "user_id"),
      countWhere("users", "user_id", ["user_verified", "=", 1]),
      countWhere("users", "user_id", ["user_status", "=", "active"]),
      countWhere("users", "user_id", ["user_status", "=", "banned"]),
      countWhere("user_rights", "user_right_id", ["user_admin", "=", 1])
    ]);

    return this.ok({
      users: { total, verified, active, banned },
      admins
    });
  }

  @dataMethod()
  public async getUserDetail(userId: string): Promise<AdminUserDetail> {
    await this.requireAdminUser();

    const row = await this.exDbOperation(() =>
      this.db.op
        .selectFrom("users")
        .leftJoin("user_rights", "user_rights.user_id", "users.user_id")
        .leftJoin("logins", "logins.user_id", "users.user_id")
        .where("users.user_id", "=", userId)
        .select([
          "users.user_id",
          "users.user_name",
          "users.user_namespace",
          "users.user_verified",
          "users.user_status",
          "users.user_created_on",
          "users.user_avatar_source",
          "user_rights.user_admin",
          "logins.login_email"
        ])
        .executeTakeFirst()
    );

    if (!row) {
      this.throw(this.responses.getNotFound("USER_NOT_FOUND"));
    }

    return this.ok({
      user_id: row.user_id,
      user_name: row.user_name,
      user_namespace: row.user_namespace,
      user_verified: Boolean(row.user_verified),
      user_status: row.user_status,
      user_created_on: row.user_created_on,
      user_avatar_source: row.user_avatar_source,
      login_email: row.login_email,
      rights: {
        user_admin: Boolean(row.user_admin)
      }
    });
  }

  @dataMethod()
  public async getUserRights(userId: string): Promise<AdminUserRights> {
    await this.requireAdminUser();

    const row = await this.exDbOperation(() =>
      this.db.op
        .selectFrom("users")
        .leftJoin("user_rights", "user_rights.user_id", "users.user_id")
        .where("users.user_id", "=", userId)
        .select(["users.user_id", "users.user_name", "user_rights.user_admin"])
        .executeTakeFirst()
    );

    if (!row) {
      this.throw(this.responses.getNotFound("USER_NOT_FOUND"));
    }

    return this.ok({
      userId: row.user_id,
      userName: row.user_name,
      rights: {
        admin: Boolean(row.user_admin)
      }
    });
  }
}
