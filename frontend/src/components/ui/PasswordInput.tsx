import { useState, type ChangeEvent } from "react";

type PasswordInputProps = {
  id: string;
  name?: string;
  value?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
  required?: boolean;
  minLength?: number;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

export default function PasswordInput({
  id,
  name,
  value,
  onChange,
  className = "",
  placeholder,
  autoComplete,
  disabled,
  required,
  minLength,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <input
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        autoComplete={autoComplete}
        className={`${className} pr-11`}
        disabled={disabled}
        id={id}
        minLength={minLength}
        name={name}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        type={isVisible ? "text" : "password"}
        value={value}
      />
      <button
        aria-label={isVisible ? "Hide password" : "Show password"}
        aria-pressed={isVisible}
        className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-[#718184] transition hover:bg-[#edf5f3] hover:text-[#078b8d] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#078b8d]"
        disabled={disabled}
        onClick={() => setIsVisible((visible) => !visible)}
        type="button"
      >
        {isVisible ? (
          <svg aria-hidden="true" className="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3l18 18" />
            <path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" />
            <path d="M9.9 4.2A10.7 10.7 0 0 1 12 4c5.5 0 9 6 9 8a10.6 10.6 0 0 1-2.1 3.2M6.2 6.2A11 11 0 0 0 3 12c0 2 3.5 8 9 8a9.7 9.7 0 0 0 4-.9" />
          </svg>
        ) : (
          <svg aria-hidden="true" className="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12c0-2 3.5-8 9-8s9 6 9 8-3.5 8-9 8-9-6-9-8Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
