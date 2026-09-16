import type { Chain } from "@/lib/types";

export function ChainMark({ chain, size = "md" }: { chain: Chain; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-10 w-10 text-xs" : "h-16 w-16 text-sm";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center font-display font-semibold text-white ${dim}`}
      style={{ background: chain.markColor }}
      aria-hidden
    >
      {chain.mark}
    </span>
  );
}
