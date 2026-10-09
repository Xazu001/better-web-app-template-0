import * as jose from "jose";

import { sessionCookie } from "$/lib/cookies";
import { verifyPassword } from "$/lib/crypto";
import { dataMethod, actionMethod } from "$/lib/decorators";
import { MailProvider } from "$/lib/mail";

import {
  BaseService,
  type FormResponseError,
  type FormResponseSuccess,
} from "./base";

import type { Database } from "$/core";

export type LoginResultData = {
  token: string;
  max_age: number;
  user_id: string;
  user_name: string;
  user_namespace: string;
  user_avatar_source: string;
};
export type LoginResult =
  | FormResponseSuccess<LoginResultData>
  | FormResponseError;
export type RegisterResult = FormResponseSuccess<boolean> | FormResponseError;

export type KeyPair = {
  privateKey: any;
  publicKey: any;
  algorithm: string;
  version?: string;
};

let cachedKeyPair: KeyPair | null = null;
let keyPairPromise: Promise<KeyPair> | null = null;

export async function getKeyPair(
  algorithm: string,
  jwtPrivate?: string,
  jwtPublic?: string,
  version?: string,
): Promise<KeyPair> {
  if (cachedKeyPair && version && cachedKeyPair.version !== version) {
    cachedKeyPair = null;
    keyPairPromise = null;
  }

  if (cachedKeyPair) {
    return cachedKeyPair;
  }

  if (keyPairPromise) {
    return keyPairPromise;
  }

  keyPairPromise = (async () => {
    if (!jwtPrivate || !jwtPublic) {
      throw new Error(
        "[Auth] Both JWT_PRIVATE_KEY and JWT_PUBLIC_KEY must be provided",
      );
    }

    const decodedPrivate = atob(jwtPrivate);
    const decodedPublic = atob(jwtPublic);

    const privateKey = await jose.importPKCS8(decodedPrivate, algorithm);
    const publicKey = await jose.importSPKI(decodedPublic, algorithm);

    const keyPair = { privateKey, publicKey, algorithm, version };

    cachedKeyPair = keyPair;
    keyPairPromise = null;
    return keyPair;
  })();

  return keyPairPromise;
}

export class AuthService extends BaseService {
  private keyPair: KeyPair;

  // Per-request memoization — the service container is recreated per request,
  // so this never leaks across requests. Admin flows call getUserFromRequest
  // several times (layout guard + service-level checks).
  private userPromise: Promise<AuthServiceUser | null> | null = null;

  constructor(request: Request, db: Database, keyPair: KeyPair) {
    super(request, db);
    this.keyPair = keyPair;
  }

  public async createToken(userId: string, noExpire?: boolean) {
    const jwt = new jose.SignJWT()
      .setSubject(userId)
      .setIssuer("app")
      .setIssuedAt()
      .setProtectedHeader({ alg: this.keyPair.algorithm });

    if (noExpire) {
      jwt.setExpirationTime("5y");
    } else {
      jwt.setExpirationTime("30d");
    }

    return jwt.sign(this.keyPair.privateKey);
  }

  @dataMethod()
  public async isEmailBanned(email: string): Promise<boolean> {
    const normalized = email.trim().toLowerCase();
    const banned = await this.exDbOperation(() =>
      this.db.op
        .selectFrom("banned_emails")
        .select("banned_email_id")
        .where("email", "=", normalized)
        .executeTakeFirst(),
    );

    return Boolean(banned);
  }

  @dataMethod()
  public async verifyToken(token: string) {
    try {
      const { payload } = await jose.jwtVerify(token, this.keyPair.publicKey);

      if (!payload.sub || !payload.iat || !payload.exp) {
        return this.none();
      }

      return this.ok({
        user_id: payload.sub,
      });
    } catch {
      return this.none();
    }
  }

  @dataMethod()
  public async verifyRequest() {
    try {
      const request = this.request;
      if (!request) {
        return this.none();
      }
      const cookieHeader = request.headers.get("Cookie");

      if (!cookieHeader) {
        return this.none();
      }

      let cookie;
      try {
        cookie = await sessionCookie.parse(cookieHeader);
      } catch {
        return this.none();
      }

      if (!cookie || !cookie.token) {
        return this.none();
      }

      const tokenResult = await this.verifyToken(cookie.token);

      if (!tokenResult?.user_id) {
        return this.none();
      }

      return this.ok({
        user_id: tokenResult.user_id,
      });
    } catch {
      return this.none();
    }
  }

  @dataMethod()
  public async getUserFromRequest(): Promise<AuthServiceUser | null> {
    this.userPromise ??= this.resolveUserFromRequest();
    return this.userPromise;
  }

  private async resolveUserFromRequest() {
    const verifyRequest = await this.verifyRequest();

    if (!verifyRequest?.user_id) {
      return this.none();
    }

    const user = await this.exDbOperation(() =>
      this.db.op
        .selectFrom("users")
        .leftJoin("user_rights", "user_rights.user_id", "users.user_id")
        .where("users.user_id", "=", verifyRequest.user_id)
        .select([
          "users.user_id",
          "users.user_name",
          "users.user_namespace",
          "users.user_avatar_source",
          "users.user_verified",
          "users.user_status",
          "user_rights.user_right_id",
          "user_rights.user_admin",
        ])
        .executeTakeFirst(),
    );

    // Banned users lose their session immediately — the JWT may still be
    // valid, but every authenticated lookup treats them as signed out.
    if (!user || user.user_status === "banned") {
      return this.none();
    }

    return this.ok(user);
  }

  /**
   * Authenticate user with email/password and return a JWT token
   * (usable for web cookie sessions and API Bearer auth alike).
   */
  @actionMethod({ general: "SOMETHING_WRONG" })
  public async loginWithPassword(
    email: string,
    password: string,
    remember: boolean = false,
  ): Promise<LoginResult> {
    const login = await this.exDbOperation(() =>
      this.db.op
        .selectFrom("logins")
        .innerJoin("users", "users.user_id", "logins.user_id")
        .where("login_email", "=", email.trim().toLowerCase())
        .select([
          "login_password",
          "users.user_id",
          "user_verified",
          "user_status",
          "user_name",
          "user_namespace",
          "user_avatar_source",
        ])
        .executeTakeFirst(),
    );

    if (!login?.login_password) {
      this.throw(this.responses.getUnauthorized("INVALID_PASSWORD"));
    }

    if (login.user_status === "banned") {
      this.throw(this.responses.getNoAccess("ACCOUNT_BANNED"));
    }

    if (!login.user_verified) {
      this.throw(this.responses.getBadRequest("VERIFY_EMAIL_REQUIRED"));
    }

    const passwordMatch = await verifyPassword(
      password,
      login.login_password || "",
    );

    if (!passwordMatch) {
      this.throw(this.responses.getUnauthorized("INVALID_PASSWORD"));
    }

    const noExpire = remember;
    const token = await this.createToken(login.user_id || "", noExpire);
    const maxAge = noExpire ? 60 * 60 * 24 * 365 * 5 : 60 * 60 * 24 * 30;

    return this.formSuccess({
      token,
      max_age: maxAge,
      user_id: login.user_id || "",
      user_name: login.user_name || "",
      user_namespace: login.user_namespace || "",
      user_avatar_source: login.user_avatar_source || "",
    });
  }

  /**
   * Register a new user with email/password and send a verification email.
   */
  @actionMethod({ general: "SOMETHING_WRONG" })
  public async registerWithPassword(data: {
    username: string;
    email: string;
    password: string;
    terms: boolean;
  }): Promise<RegisterResult> {
    if (!data.terms) {
      this.throw(this.responses.getBadRequest("TERMS_REQUIRED"));
    }

    if (await this.isEmailBanned(data.email)) {
      this.throw({ email: "EMAIL_BANNED" });
    }

    const verificationCode = crypto.randomUUID();

    // Create the account first — sending the mail before the DB write made a
    // duplicate email/username deliver a verification link for an account
    // that was never created.
    const result = await this.user.createUser({
      username: data.username,
      email: data.email,
      password: data.password,
      verified: false,
      verificationCode,
    });

    if (!result) {
      this.throw({
        email: "EMAIL_ALREADY_IN_USE",
        username: "USERNAME_ALREADY_TAKEN",
      });
    }

    const mailProvider = new MailProvider(this.env.EMAIL);

    try {
      await mailProvider.generateAndSend(
        {
          template: "ConfirmRegistration",
          props: { userName: data.username, verificationCode },
        },
        data.email,
        "Confirm your registration",
      );
    } catch (error) {
      // Roll the account back so the user can simply retry registration —
      // otherwise the taken email would block them with no way to verify.
      console.error("[Auth] Failed to send verification email:", error);
      await this.user.deleteUserData(result.userId);
      this.throw(this.responses.getBadRequest("SEND_VERIFICATION_EMAIL_ERROR"));
    }

    return this.formSuccess(true);
  }
}

/** Row returned by `getUserFromRequest` (users ⋈ user_rights) — derived, stays in sync with the select. */
export type AuthServiceUser = NonNullable<
  Awaited<ReturnType<AuthService["resolveUserFromRequest"]>>
>;
