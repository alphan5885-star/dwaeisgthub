import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isAbortLikeError(err: unknown) {
  if (!err) return false;
  if (typeof err === "string") {
    return (
      err.includes("AbortError") ||
      err.includes("ERR_ABORTED") ||
      err.includes("aborted") ||
      err.includes("canceled")
    );
  }
  const anyErr = err as any;
  const name = typeof anyErr?.name === "string" ? anyErr.name : "";
  const message = typeof anyErr?.message === "string" ? anyErr.message : "";
  return (
    name === "AbortError" ||
    message.includes("AbortError") ||
    message.includes("ERR_ABORTED") ||
    message.includes("aborted") ||
    message.includes("canceled")
  );
}

export function devLog(...args: any[]) {
  if (!import.meta.env.DEV) return;
  console.log(...args);
}

export function devWarn(...args: any[]) {
  if (!import.meta.env.DEV) return;
  console.warn(...args);
}

export function devError(message: string, err?: unknown, extra?: Record<string, unknown>) {
  if (!import.meta.env.DEV) return;
  if (isAbortLikeError(err)) return;
  if (extra) console.error(message, err, extra);
  else if (err !== undefined) console.error(message, err);
  else console.error(message);
}
