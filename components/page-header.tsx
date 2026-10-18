import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function PageHeader({
  title,
  backHref,
  actions,
  subtitle,
}: {
  title: string;
  backHref?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 bg-navy px-4 py-3 text-white lg:rounded-b-2xl lg:mx-0">
      {backHref ? (
        <Link
          href={backHref}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      ) : null}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold">{title}</h1>
        {subtitle ? <p className="truncate text-xs text-white/70">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}
