import { cn } from "@/lib/utils";

export function Logo({
  variant = "light-bg",
  className,
  size = "md",
}: {
  variant?: "light-bg" | "dark-bg" | "clean";
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const heightClass = {
    sm: "h-7",
    md: "h-9",
    lg: "h-12",
    xl: "h-14",
  }[size];

  if (variant === "dark-bg") {
    return (
      <div className={cn("inline-flex items-center rounded-2xl bg-white px-3 py-1.5 shadow-sm border border-slate-100", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="Swarnim AAC Block Pvt. Ltd."
          className={cn("w-auto object-contain", heightClass)}
        />
      </div>
    );
  }

  return (
    <div className={cn("inline-flex items-center", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="Swarnim AAC Block Pvt. Ltd."
        className={cn("w-auto object-contain", heightClass)}
      />
    </div>
  );
}
