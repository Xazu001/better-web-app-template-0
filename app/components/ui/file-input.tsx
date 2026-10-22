import * as React from "react";

import { Icon } from "#/components/ui/icon";
import { cn } from "#/components/utils";
import { type VariantProps, createVariants } from "#/components/utils/variants";
import { useRipple } from "#/lib/hooks/use-ripple";

const fileInputVariants = createVariants("ui-file-input", {
  variants: {
    variant: {
      "elevation-1": "ui-file-input--elevation-1",
      "elevation-2": "ui-file-input--elevation-2"
    },
    size: {
      sm: "ui-file-input--sm",
      md: "ui-file-input--md",
      lg: "ui-file-input--lg"
    }
  },
  defaultVariants: {
    variant: "elevation-1",
    size: "md"
  }
});

export interface FileInputProps
  extends
    Omit<
      React.InputHTMLAttributes<HTMLInputElement>,
      "size" | "type" | "value" | "onChange" | "onError"
    >,
    VariantProps<typeof fileInputVariants> {
  label?: string;
  helperText?: string;
  error?: boolean;
  errorMessage?: string;
  maxSize?: number;
  multiple?: boolean;
  initialFile?: File | null;
  onFilesSelected?: (files: File[]) => void;
  onError?: (message: string) => void;
}

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024;

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const FileInput = React.forwardRef<HTMLInputElement, FileInputProps>(
  (
    {
      className,
      variant,
      size,
      label,
      helperText,
      error,
      errorMessage,
      accept,
      maxSize = DEFAULT_MAX_SIZE,
      multiple = false,
      disabled,
      initialFile,
      onFilesSelected,
      onError,
      id,
      name,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;
    const internalRef = React.useRef<HTMLInputElement | null>(null);
    React.useImperativeHandle(ref, () => internalRef.current as HTMLInputElement);

    const { surfaceRef, handlers, rippleState } = useRipple<HTMLSpanElement>(disabled);

    const [files, setFiles] = React.useState<File[]>(() => (initialFile ? [initialFile] : []));
    const [isDragging, setIsDragging] = React.useState(false);

    // Re-sync the displayed file when the controlled initialFile changes
    const [prevInitialFile, setPrevInitialFile] = React.useState(initialFile);
    if (initialFile !== prevInitialFile) {
      setPrevInitialFile(initialFile);
      setFiles(initialFile ? [initialFile] : []);
    }

    const isError = error || Boolean(errorMessage);
    const uiState = isError ? "error" : disabled ? "disabled" : "enabled";

    const acceptTypes = React.useMemo(
      () => (accept ? accept.split(",").map((t) => t.trim().toLowerCase()) : null),
      [accept]
    );

    const validate = (incoming: File[]): File[] | null => {
      const valid: File[] = [];
      for (const file of incoming) {
        if (file.size > maxSize) {
          onError?.(`File "${file.name}" exceeds ${formatFileSize(maxSize)}`);
          return null;
        }
        if (acceptTypes) {
          const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
          const mime = file.type.toLowerCase();
          const matches = acceptTypes.some(
            (t) => t === mime || t === ext || (t.endsWith("/*") && mime.startsWith(t.slice(0, -1)))
          );
          if (!matches) {
            onError?.(`File "${file.name}" has unsupported type`);
            return null;
          }
        }
        valid.push(file);
      }
      return valid;
    };

    const handleChange = (incoming: FileList | null) => {
      if (!incoming || incoming.length === 0) return;
      const arr = Array.from(incoming);
      const valid = validate(arr);
      if (!valid) return;
      const next = multiple ? valid : valid.slice(0, 1);
      setFiles(next);
      onFilesSelected?.(next);
    };

    const openPicker = () => {
      if (disabled) return;
      internalRef.current?.click();
    };

    const removeFile = (e: React.MouseEvent, index: number) => {
      e.stopPropagation();
      if (disabled) return;
      const next = files.filter((_, i) => i !== index);
      setFiles(next);
      onFilesSelected?.(next);
      if (internalRef.current) internalRef.current.value = "";
    };

    const onDrop = (e: React.DragEvent) => {
      e.preventDefault();
      if (disabled) return;
      setIsDragging(false);
      handleChange(e.dataTransfer.files);
    };

    const onDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      if (disabled) return;
      setIsDragging(true);
    };

    const onDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
    };

    const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      handleChange(e.target.files);
    };

    const onKeydown = (e: React.KeyboardEvent) => {
      if (disabled) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openPicker();
      }
    };

    const cls = cn(
      fileInputVariants({ variant, size: size || "md" }),
      isError && "ui-file-input--error",
      isDragging && "ui-file-input--dragging",
      disabled && "ui-file-input--disabled",
      rippleState.pressed && "ui-file-input--pressed",
      className
    );

    return (
      <div className={cls} data-state={uiState}>
        {(label || errorMessage) && (
          <div className="ui-file-input__header">
            {label && (
              <label htmlFor={inputId} className="ui-file-input__label">
                {label}
              </label>
            )}
            {errorMessage && (
              <span id={errorId} className="ui-file-input__error" role="alert">
                <Icon.AlertCircle className="ui-file-input__error-icon" size="sm" />
                <span>{errorMessage}</span>
              </span>
            )}
          </div>
        )}

        <div
          className="ui-file-input__dropzone"
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled}
          aria-label={label || "Choose file"}
          aria-describedby={errorMessage ? errorId : helperText ? helperId : undefined}
          aria-invalid={isError}
          onClick={openPicker}
          onKeyDown={onKeydown}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          {...handlers}
        >
          <span ref={surfaceRef} className="ui-file-input__ripple" aria-hidden="true">
            <span className="uix-ripple" />
          </span>
          <span className="ui-file-input__state-layer" aria-hidden="true" />

          <input
            ref={internalRef}
            id={inputId}
            name={name}
            type="file"
            accept={accept}
            multiple={multiple}
            disabled={disabled}
            className="ui-file-input__native"
            aria-label={label || "Choose file"}
            aria-describedby={errorMessage ? errorId : helperText ? helperId : undefined}
            aria-invalid={isError}
            onChange={onInputChange}
            {...props}
          />

          {files.length === 0 ? (
            <div className="ui-file-input__empty">
              <Icon.Upload className="ui-file-input__icon" size="lg" />
              <span className="ui-file-input__empty-text">
                <span className="ui-file-input__empty-title">
                  Drop file here or click to browse
                </span>
                {helperText && (
                  <span id={helperId} className="ui-file-input__empty-helper">
                    {helperText}
                  </span>
                )}
              </span>
            </div>
          ) : (
            <div className="ui-file-input__files">
              {files.map((file, index) => (
                <div key={`${file.name}-${index}`} className="ui-file-input__file">
                  <span className="ui-file-input__file-name">{file.name}</span>
                  <span className="ui-file-input__file-size">{formatFileSize(file.size)}</span>
                  <button
                    type="button"
                    className="ui-file-input__remove"
                    onClick={(e) => removeFile(e, index)}
                    disabled={disabled}
                    aria-label={`Remove ${file.name}`}
                  >
                    <Icon.X size="sm" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
);
FileInput.displayName = "FileInput";

export { FileInput };
