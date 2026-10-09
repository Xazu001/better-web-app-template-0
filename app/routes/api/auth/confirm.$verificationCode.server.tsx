import { redirect } from "react-router";

import { type RouteLoaderArgs, createRouteService } from "$/lib/decorators";
import { BaseService } from "$/services/base";
import { buildStatusUrl } from "@/utils";

// ──────────────────────────────────────────────────────────────
// Route Service
// ──────────────────────────────────────────────────────────────

class RouteService extends BaseService {
  async confirmEmail(verificationCode: string) {
    const login = await this.exDbOperation(() =>
      this.db.op
        .selectFrom("logins")
        .innerJoin("users", "users.user_id", "logins.user_id")
        .where("logins.login_verification_code", "=", verificationCode)
        .select([
          "users.user_id",
          "users.user_verified",
          "logins.login_verification_code_expires_on"
        ])
        .executeTakeFirst()
    );

    if (!login) {
      return redirect(
        buildStatusUrl({
          success: false,
          title: "Verification Failed",
          description:
            "The verification link is invalid or has already been used. Please request a new verification email from your account settings.",
          returnTo: "/login",
          returnLabel: "Back to login"
        })
      );
    }

    const expiresOn = login.login_verification_code_expires_on;

    if (expiresOn !== null && expiresOn < Date.now()) {
      return redirect(
        buildStatusUrl({
          success: false,
          title: "Verification Link Expired",
          description:
            "This verification link has expired. Please register again or request a new verification email.",
          returnTo: "/login",
          returnLabel: "Back to login"
        })
      );
    }

    if (login.user_verified) {
      return redirect(
        buildStatusUrl({
          success: true,
          title: "Email Already Verified",
          description:
            "Your email address has already been confirmed. You can sign in to your account now.",
          returnTo: "/login",
          returnLabel: "Back to login"
        })
      );
    }

    await this.exDbOperation(() =>
      this.db.op
        .updateTable("users")
        .set({ user_verified: true })
        .where("users.user_id", "=", login.user_id)
        .execute()
    );

    await this.exDbOperation(() =>
      this.db.op
        .updateTable("logins")
        .set({ login_verification_code: null })
        .where("logins.user_id", "=", login.user_id)
        .execute()
    );

    return redirect(
      buildStatusUrl({
        success: true,
        title: "Email Verified Successfully",
        description:
          "Your email address has been confirmed and your account is now active. You can sign in to start using the app.",
        returnTo: "/login",
        returnLabel: "Back to login"
      })
    );
  }
}

// ──────────────────────────────────────────────────────────────
// Route Loader
// ──────────────────────────────────────────────────────────────

export async function loader({ context, request, params }: RouteLoaderArgs) {
  const route = createRouteService(RouteService, context, request);
  try {
    return await route.confirmEmail(params.verificationCode as string);
  } catch (error) {
    console.error("Email verification error:", error);
    return redirect(
      buildStatusUrl({
        success: false,
        title: "Verification Failed",
        description:
          "An unexpected error occurred while verifying your email. Please try again later or contact support if the problem persists.",
        returnTo: "/login",
        returnLabel: "Back to login"
      })
    );
  }
}
