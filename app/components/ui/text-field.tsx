import * as React from "react";

import { Dialog, DialogContent } from "#/components/ui/dialog";
import { Icon } from "#/components/ui/icon";
import { cn } from "#/components/utils";
import { useBreakpoint } from "#/lib/hooks";

export interface TextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  labelClassName?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "glass-elevation-1" | "glass-elevation-2";
  error?: boolean;
  errorMessage?: string;
  showTogglePassword?: boolean;
  /**
   * On mobile (below `tablet` breakpoint), focusing the input opens a Dialog
   * with a larger input for comfortable editing. The original input becomes a
   * read-only trigger so the mobile keyboard does not pop up over the dialog.
   */
  displayDialogOn?: boolean;
}

const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  (
    {
      className,
      label,
      labelClassName,
      size,
      variant = "default",
      error,
      errorMessage,
      showTogglePassword = false,
      displayDialogOn = false,
      id,
      type,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const isError = error || Boolean(errorMessage);
    const md3State = isError ? "error" : props.disabled ? "disabled" : "enabled";

    const isMobile = useBreakpoint("tablet");
    const showDialog = displayDialogOn && isMobile;
    const [dialogOpen, setDialogOpen] = React.useState(false);

    const [isPasswordVisible, setIsPasswordVisible] = React.useState(false);
    const toggleRef = React.useRef<HTMLButtonElement>(null);
    const isPasswordField = showTogglePassword && type === "password";
    const resolvedType = isPasswordField ? (isPasswordVisible ? "text" : "password") : type;

    const handleTogglePassword = () => {
      setIsPasswordVisible((prev) => !prev);
    };

    const handleTriggerFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      if (showDialog) {
        setDialogOpen(true);
        e.target.blur();
        return;
      }
      onFocus?.(e);
    };

    const handleTriggerBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (showDialog) return;
      onBlur?.(e);
    };

    const handleDialogBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      onBlur?.(e);
      setDialogOpen(false);
    };

    return (
      <>
        <div
          className={cn(
            "md3-text-field",
            `md3-text-field--${size || "md"}`,
            variant !== "default" && `md3-text-field--${variant}`,
            isError && "md3-text-field--error",
            label && "md3-text-field--has-label",
            isPasswordField && "md3-text-field--has-toggle",
            showDialog && "md3-text-field--dialog-trigger",
            className
          )}
          data-state={md3State}
        >
          {(label || errorMessage) && (
            <div className="md3-text-field__header">
              {label && (
                <label htmlFor={inputId} className={cn("md3-text-field__label", labelClassName)}>
                  {label}
                </label>
              )}
              {errorMessage && (
                <span id={errorId} className="md3-text-field__error" role="alert">
                  <Icon.AlertCircle className="md3-text-field__error-icon" />
                  <span>{errorMessage}</span>
                </span>
              )}
            </div>
          )}
          <div className="md3-text-field__container">
            <input
              ref={ref}
              id={inputId}
              type={resolvedType}
              className="md3-text-field__input"
              aria-invalid={isError}
              aria-describedby={errorMessage ? errorId : undefined}
              readOnly={showDialog}
              onFocus={handleTriggerFocus}
              onBlur={handleTriggerBlur}
              {...props}
            />
            {isPasswordField && (
              <button
                ref={toggleRef}
                type="button"
                className="md3-text-field__toggle"
                onClick={handleTogglePassword}
                aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                aria-pressed={isPasswordVisible}
                tabIndex={-1}
              >
                {isPasswordVisible ? (
                  <Icon.EyeOff className="md3-text-field__toggle-icon" />
                ) : (
                  <Icon.Eye className="md3-text-field__toggle-icon" />
                )}
              </button>
            )}
          </div>
        </div>
        {showDialog && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent size="sm" variant="elevation">
              <TextField
                {...props}
                className={className}
                label={label}
                labelClassName={labelClassName}
                size={size}
                variant={variant}
                error={error}
                errorMessage={errorMessage}
                showTogglePassword={showTogglePassword}
                type={type}
                autoFocus
                onBlur={handleDialogBlur}
              />
            </DialogContent>
          </Dialog>
        )}
      </>
    );
  }
);
TextField.displayName = "TextField";

export { TextField };

export { TextField as Input };
