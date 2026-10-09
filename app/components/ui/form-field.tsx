import * as React from "react";

import { Icon } from "#/components/ui/icon";
import { TextField } from "#/components/ui/text-field";
import { cn } from "#/components/utils";

export interface FormFieldProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "size" | "label"
> {
  label?: string;
  labelClassName?: string;
  variant?: "default" | "glass-elevation-1" | "glass-elevation-2";
  size?: "sm" | "md" | "lg";
  error?: boolean;
  errorMessage?: string;
  showTogglePassword?: boolean;
}

const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  (
    {
      className,
      label,
      labelClassName,
      variant = "default",
      size,
      error,
      errorMessage,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const isError = error || Boolean(errorMessage);
    const fieldState = isError ? "error" : props.disabled ? "disabled" : "default";

    return (
      <div
        className={cn(
          "form-field",
          `form-field--${size || "md"}`,
          variant !== "default" && `form-field--${variant}`,
          isError && "form-field--error",
          label && "form-field--has-label",
          className
        )}
        data-state={fieldState}
      >
        {(label || errorMessage) && (
          <div className="form-field__header">
            {label && (
              <label htmlFor={inputId} className={cn("form-field__label", labelClassName)}>
                {label}
              </label>
            )}
            {errorMessage && (
              <span id={errorId} className="form-field__error" role="alert">
                <Icon.AlertCircle className="form-field__error-icon" size="sm" />
                <span>{errorMessage}</span>
              </span>
            )}
          </div>
        )}
        <TextField
          ref={ref}
          id={inputId}
          variant={variant}
          size={size}
          error={isError}
          aria-invalid={isError}
          aria-describedby={errorMessage ? errorId : undefined}
          {...props}
        />
      </div>
    );
  }
);
FormField.displayName = "FormField";

export { FormField };
