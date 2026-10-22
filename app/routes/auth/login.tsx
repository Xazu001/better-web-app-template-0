import * as React from "react";
import { Link, useFetcher, useSearchParams } from "react-router";

import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import { FormField } from "#/components/ui/form-field";
import { useSubmitAction } from "#/lib/router";
import { createMeta } from "#/lib/seo";
import { getMessageByKey } from "@/utils";
import { LoginSchema } from "@/validators";

import { AuthLayout, authSize } from "./layout";
import { action } from "./login.server";

import type { Route } from "./+types/login";

// ──────────────────────────────────────────────────────────────
// Route Helpers (Types, other utils)
// ──────────────────────────────────────────────────────────────

type Inputs = {
  email: string;
  password: string;
  remember: string;
};

// ──────────────────────────────────────────────────────────────
// Route Loader & Action
// ──────────────────────────────────────────────────────────────

export { action };

// ──────────────────────────────────────────────────────────────
// Route Meta
// ──────────────────────────────────────────────────────────────

export const meta: Route.MetaFunction = ({ matches }) => {
  return createMeta(matches, {
    title: "Login",
    description: "Log in to your account.",
    noIndex: true
  });
};

// ──────────────────────────────────────────────────────────────
// Route Component
// ──────────────────────────────────────────────────────────────

export default function Index() {
  const fetcher = useFetcher();
  const [searchParams] = useSearchParams();
  const urlError = searchParams.get("error");

  const { submit, isSubmitting, errors, success } = useSubmitAction<Inputs>({
    fetcher,
    navigateTo: "/",
    schema: LoginSchema
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    submit(formData, {
      method: "POST",
      action: "/login"
    });
  };

  return (
    <AuthLayout title="Login" subtitle="Welcome back!" fetcher={fetcher} onSubmit={handleSubmit}>
      <div className="flex flex-col">
        <FormField
          label="Email"
          labelClassName="text-on-glass"
          name="email"
          type="text"
          variant="glass-elevation-2"
          placeholder="john@example.com"
          errorMessage={errors?.email}
          size={authSize}
        />
        <FormField
          label="Password"
          labelClassName="text-on-glass"
          name="password"
          type="password"
          variant="glass-elevation-2"
          placeholder="••••••••"
          errorMessage={errors?.password}
          showTogglePassword
          size={authSize}
        />
        <Checkbox
          id="remember"
          name="remember"
          label="Remember me"
          defaultChecked
          variant="glass-elevation-2"
          size={authSize}
          wrapperClassName="py-1 mt-2"
          onChange={() => {}}
        />
      </div>

      <div className="flex flex-col gap-1 pt-1 mt-2">
        {urlError && !errors?.general && (
          <Alert variant="glass-error">
            <AlertTitle>Authentication Error</AlertTitle>
            <AlertDescription>{getMessageByKey(urlError)}</AlertDescription>
          </Alert>
        )}
        {errors?.general && (
          <Alert variant="glass-error">
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>{getMessageByKey(errors.general)}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert variant="glass-success">
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>You have been logged in successfully!</AlertDescription>
          </Alert>
        )}
      </div>

      <div className="flex flex-col gap-2 mt-4">
        <Button
          variant="primary"
          type="submit"
          state={isSubmitting ? "loading" : "default"}
          disabled={isSubmitting}
          size={authSize}
          className="w-full"
        >
          Login
        </Button>
        <p className="text-center text-md text-on-glass">
          Don't have an account?{" "}
          <Link to="/register" className="uix-link-muted-primary-underline">
            Register
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
