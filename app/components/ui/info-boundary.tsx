import { Link } from "react-router";

import { Button } from "#/components/ui/button";
import { resolveRouteError } from "#/lib/router";

import type * as React from "react";

export interface InfoBoundaryProps {
  error: unknown;
  title?: React.ReactNode;
}

const InfoBoundary = ({ error, title }: InfoBoundaryProps) => {
  const { code, statusText, message } = resolveRouteError(error);

  const defaultTitle =
    code === "404" ? (
      <>
        Page Not <br /> Found
      </>
    ) : code === "403" ? (
      <>
        Access <br /> Denied
      </>
    ) : (
      <>
        Something Bad <br /> Happened
      </>
    );

  const heading = title ?? defaultTitle;
  const showStatusText = Boolean(statusText && statusText.toLowerCase() !== message.toLowerCase());

  return (
    <main className="pt-top-site px-site">
      <section className="flex flex-col items-start justify-center min-h-[50vh] cont">
        <h2 className="font-header font-regular text-4xl text-on-surface">{heading}</h2>
        <p className="text-error text-xl">{code}</p>
        <p className="text-lg">{message}</p>
        {showStatusText && (
          <div>
            <p className="text-lg">{statusText}</p>
          </div>
        )}
        <Link to="/" className="mt-4">
          <Button size="lg" variant="ghost">
            Back to Home
          </Button>
        </Link>
      </section>
    </main>
  );
};

export { InfoBoundary };
