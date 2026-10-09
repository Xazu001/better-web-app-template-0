import { data } from "react-router";

import { cookiesModify } from "$/lib/cookies";
import { createRouteService, actionMethod, type RouteActionArgs } from "$/lib/decorators";
import { BaseService, type FormErrors } from "$/services/base";
import { Validator, LoginSchema } from "@/validators";

// ──────────────────────────────────────────────────────────────
// Route Service
// ──────────────────────────────────────────────────────────────

class RouteService extends BaseService {
  @actionMethod({ general: "SOMETHING_WRONG" })
  public async loginUser() {
    const validationResult = await Validator.validateForm(this.request, LoginSchema);

    if (!Validator.isSuccess(validationResult)) {
      this.throw(validationResult.errors as FormErrors);
    }

    const { email, password, remember } = validationResult.data;

    return await this.auth.loginWithPassword(email, password, remember === "on");
  }
}

// ──────────────────────────────────────────────────────────────
// Route Action
// ──────────────────────────────────────────────────────────────

export async function action({ context, request }: RouteActionArgs) {
  const route = createRouteService(RouteService, context, request);
  const rl = await route.rateLimitForm();
  if (rl.isError) return data(rl.getError());

  const res = await route.loginUser();

  if (!res.success) return data(res);

  const { token, max_age } = res.result;
  const headers = await cookiesModify(request, (m, c) => {
    m.clearCookie(c.session);
    m.setCookie(c.session, { token }, { maxAge: max_age });
    return m.getHeaders(request);
  });

  return data(res, { headers });
}
