import { ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  ariaLabel: string;
}

export default function Select({
  value,
  onChange,
  options,
  ariaLabel,
}: SelectProps) {
  return (
    <label className="relative flex h-11 items-center rounded-[10px] border border-line bg-white shadow-sm focus-within:border-brand-600 focus-within:ring-3 focus-within:ring-brand-50/80">
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-full cursor-pointer appearance-none bg-transparent pl-3 pr-9 text-ink outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        aria-hidden="true"
        className="pointer-events-none absolute right-3 text-muted"
      />
    </label>
  );
}
