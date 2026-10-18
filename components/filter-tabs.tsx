import Link from "next/link";

export function FilterTabs({
  items,
}: {
  items: { href: string; label: string; active?: boolean; count?: number }[];
}) {
  return (
    <div className="flex gap-1 rounded-2xl bg-navy-100 p-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex-1 rounded-xl px-3 py-2 text-center text-sm font-semibold ${
            item.active ? "bg-white text-navy shadow-sm" : "text-navy-500"
          }`}
        >
          {item.label}
          {item.count != null ? (
            <span className="ml-1 text-xs opacity-70">{item.count}</span>
          ) : null}
        </Link>
      ))}
    </div>
  );
}
