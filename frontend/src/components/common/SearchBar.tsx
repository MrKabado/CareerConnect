import { Search } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchBar({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
}: SearchBarProps) {
  return (
    <label
      className={`flex h-11 items-center gap-2.5 rounded-[10px] border border-line bg-white px-3.5 text-muted shadow-sm focus-within:border-brand-600 focus-within:ring-3 focus-within:ring-brand-50/80 ${className}`}
    >
      <Search size={16} aria-hidden="true" />
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-muted"
      />
    </label>
  );
}
