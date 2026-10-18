import { cn, initials, avatarTone } from "@/lib/utils";

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold",
        size === "sm" ? "h-10 w-10 text-sm" : "h-12 w-12 text-base",
        avatarTone(name),
      )}
    >
      {initials(name)}
    </div>
  );
}
