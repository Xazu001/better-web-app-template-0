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
    const md3State = error
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
          "md3-text-area",
          `md3-text-area--${size || "md"}`,
          error && "md3-text-area--error",
          label && "md3-text-area--has-label",
          className
        )}
        data-state={md3State}
      >
        {label && (
          <label htmlFor={inputId} className={cn("md3-text-area__label", labelClassName)}>
            {label}
          </label>
        )}
        <div className="md3-text-area__container">
          <textarea
            ref={ref}
            id={inputId}
            className="md3-text-area__input"
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
            className={cn("md3-text-area__helper", error && "md3-text-area__helper--error")}
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
