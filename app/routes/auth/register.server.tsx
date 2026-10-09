import { data } from "react-router";

import { createRouteService, actionMethod, type RouteActionArgs } from "$/lib/decorators";
import { BaseService, type FormErrors } from "$/services/base";
import { Validator, RegisterSchema } from "@/validators";

// ──────────────────────────────────────────────────────────────
// Route Service
// ──────────────────────────────────────────────────────────────

class RouteService extends BaseService {
  @actionMethod({ general: "SOMETHING_WRONG" })
  public async registerUser() {
    const validationResult = await Validator.validateForm(this.request, RegisterSchema);

    if (!Validator.isSuccess(validationResult)) {
      this.throw(validationResult.errors as FormErrors);
    }

    const { email, password, username, terms } = validationResult.data;

    return await this.auth.registerWithPassword({
      username,
      email,
      password,
      terms
    });
  }
}

// ──────────────────────────────────────────────────────────────
// Route Action
// ──────────────────────────────────────────────────────────────

export async function action({ context, request }: RouteActionArgs) {
  const route = createRouteService(RouteService, context, request);
  const rl = await route.rateLimitForm();
  if (rl.isError) return data(rl.getError());
  return data(await route.registerUser());
}
