import * as React from "react";
import { Link, useFetcher } from "react-router";

import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import { FormField } from "#/components/ui/form-field";
import { useSubmitAction } from "#/lib/router";
import { createMeta } from "#/lib/seo";
import { toast } from "#/lib/toast";
import { getMessageByKey } from "@/utils";
import { RegisterSchema } from "@/validators";

import { AuthLayout, authSize } from "./layout";
import { action } from "./register.server";

import type { StatusProps } from "../status";
import type { Route } from "./+types/register";

// ──────────────────────────────────────────────────────────────
// Route Helpers (Types, other utils)
// ──────────────────────────────────────────────────────────────

type Inputs = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  terms: string;
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
    title: "Register",
    description: "Create your account.",
    noIndex: true
  });
};

// ──────────────────────────────────────────────────────────────
// Route Component
// ──────────────────────────────────────────────────────────────

export default function Index() {
  const fetcher = useFetcher();

  const { submit, isSubmitting, errors, success } = useSubmitAction<Inputs>({
    fetcher,
    schema: RegisterSchema,
    onSuccess: () => {
      toast.success("Registration successful! Please check your email to verify your account.");
    },
    navigateTo: "/status",
    navigateOptions: {
      replace: true,
      state: {
        success: true,
        title: "Registration Successful",
        description:
          "Your account has been created. We've sent a verification link to your email — please confirm your address to activate your account.",
        returnTo: "/login",
        returnLabel: "Back to login"
      } satisfies StatusProps
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    submit(formData, {
      method: "POST",
      action: "/register"
    });
  };

  return (
    <AuthLayout
      title="Register"
      subtitle="Create your account!"
      fetcher={fetcher}
      onSubmit={handleSubmit}
    >
      <div className="flex flex-col">
        <FormField
          label="Username"
          labelClassName="text-on-glass"
          name="username"
          type="text"
          variant="glass-elevation-2"
          placeholder="John_Doe"
          errorMessage={errors?.username && getMessageByKey(errors.username)}
          size={authSize}
        />
        <FormField
          label="Email"
          labelClassName="text-on-glass"
          name="email"
          type="text"
          variant="glass-elevation-2"
          placeholder="john@example.com"
          errorMessage={errors?.email && getMessageByKey(errors.email)}
          size={authSize}
        />
        <FormField
          label="Password"
          labelClassName="text-on-glass"
          name="password"
          type="password"
          variant="glass-elevation-2"
          placeholder="••••••••"
          errorMessage={errors?.password && getMessageByKey(errors.password)}
          showTogglePassword
          size={authSize}
        />
        <FormField
          label="Confirm Password"
          labelClassName="text-on-glass"
          name="confirmPassword"
          type="password"
          variant="glass-elevation-2"
          placeholder="••••••••"
          errorMessage={errors?.confirmPassword && getMessageByKey(errors.confirmPassword)}
          showTogglePassword
          size={authSize}
        />
        <Checkbox
          id="terms"
          name="terms"
          label="I agree to the Terms and Conditions"
          variant="glass-elevation-2"
          size={authSize}
          wrapperClassName="py-1 mt-2"
        />
      </div>

      <div className="flex flex-col gap-1 pt-1 mt-2">
        {errors?.general && (
          <Alert variant="glass-error">
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>{getMessageByKey(errors.general)}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert variant="glass-success">
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>
              Almost there — we've sent a verification link to your email. Confirm it to activate
              your account.
            </AlertDescription>
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
          Register
        </Button>
        <p className="text-center text-md text-on-glass">
          Already have an account?{" "}
          <Link to="/login" className="uix-link-muted-primary-underline">
            Login
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
