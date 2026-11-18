import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const control = "flex w-full rounded-md border border-border bg-[var(--surface)] px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "h-10 min-w-0", className)} {...props} />;
}
export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-24", className)} {...props} />;
}
export function NativeSelect({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(control, "h-10 min-w-0", className)} {...props} />;
}
