import { Search } from "lucide-react";

export function SearchInput({
  placeholder,
  name = "q",
  defaultValue,
}: {
  placeholder: string;
  name?: string;
  defaultValue?: string;
}) {
  return (
    <label className="relative block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="field pl-9"
      />
    </label>
  );
}
