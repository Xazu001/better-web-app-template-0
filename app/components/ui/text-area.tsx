import * as React from "react";

import { cn } from "#/components/utils";

export interface TextAreaProps extends Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "size"
> {
  label?: string;
  labelClassName?: string;
  size?: "sm" | "md" | "lg";
  error?: boolean;
  helperText?: string;
}

const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      className,
      label,
      labelClassName,
      size,
      error,
      helperText,
      id,
      onFocus,
      onBlur,
      placeholder,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const helperId = `${inputId}-helper`;
    const [focused, setFocused] = React.useState(false);
    const uiState = error
      ? "error"
      : props.disabled
        ? "disabled"
        : focused
          ? "focused"
          : "enabled";

    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setFocused(true);
      onFocus?.(e);
    };
    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setFocused(false);
      onBlur?.(e);
    };

    return (
      <div
        className={cn(
          "ui-text-area",
          `ui-text-area--${size || "md"}`,
          error && "ui-text-area--error",
          label && "ui-text-area--has-label",
          className
        )}
        data-state={uiState}
      >
        {label && (
          <label htmlFor={inputId} className={cn("ui-text-area__label", labelClassName)}>
            {label}
          </label>
        )}
        <div className="ui-text-area__container">
          <textarea
            ref={ref}
            id={inputId}
            className="ui-text-area__input"
            placeholder={placeholder}
            aria-invalid={error}
            aria-describedby={helperText ? helperId : undefined}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
          />
        </div>
        {helperText && (
          <p
            id={helperId}
            className={cn("ui-text-area__helper", error && "ui-text-area__helper--error")}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
TextArea.displayName = "TextArea";

export { TextArea };
export { TextArea as Textarea };
