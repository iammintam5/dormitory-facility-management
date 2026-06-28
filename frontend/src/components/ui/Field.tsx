import { ReactNode, useId, cloneElement, isValidElement } from 'react';

type FieldProps = {
  id?: string;
  label: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
};

export function Field({ id, label, error, helperText, required, children, className = '' }: FieldProps) {
  const defaultId = useId();
  const inputId = id || defaultId;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={inputId} className="text-sm font-medium text-foreground flex gap-1 items-center">
        {label}
        {required && <span aria-hidden="true" className="text-destructive">*</span>}
        {required && <span className="sr-only">bắt buộc</span>}
      </label>
      
      {isValidElement(children) ? cloneElement(children as React.ReactElement<any>, {
        id: inputId,
        'aria-invalid': error ? 'true' : undefined,
        'aria-describedby': [
          error ? errorId : null,
          helperText && !error ? helperId : null // Hide helper if error replaces it, or show both
        ].filter(Boolean).join(' ') || undefined,
        required,
      }) : children}

      {helperText && !error && (
        <p id={helperId} className="text-xs text-muted-foreground">{helperText}</p>
      )}
      
      {error && (
        <p id={errorId} className="text-xs text-destructive font-medium" role="alert">{error}</p>
      )}
    </div>
  );
}
