"use client";

import Image from "next/image";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";

type MenuItemPickTileProps = {
  name: string;
  priceLabel: string;
  imageUrl?: string | null;
  onPick: () => void;
};

export function MenuItemPickTile({
  name,
  priceLabel,
  imageUrl,
  onPick,
}: MenuItemPickTileProps) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[12px]",
        "border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-left",
        "transition-[border-color,background-color,transform] duration-150",
        "hover:border-[hsl(var(--border-strong))] hover:bg-[hsl(var(--accent))]",
        "active:translate-y-[0.5px]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.5)] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]",
      )}
    >
      <div className="relative aspect-[4/3] w-full bg-[hsl(var(--muted))]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover transition duration-300 ease-out group-hover:scale-[1.02]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 220px"
          />
        ) : (
          <div className="flex h-full min-h-[96px] items-center justify-center px-2 text-center text-[11px] font-medium text-[hsl(var(--muted-foreground))]">
            No image
          </div>
        )}

        <div
          className={cn(
            "pointer-events-none absolute right-2 top-2 grid size-7 place-items-center rounded-full",
            "border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.85)] backdrop-blur-md",
            "opacity-0 transition-opacity duration-150 group-hover:opacity-100",
          )}
          aria-hidden
        >
          <Plus className="size-3.5 text-[hsl(var(--foreground))]" />
        </div>
      </div>
      <div className="grid gap-0.5 p-3">
        <span className="line-clamp-1 text-[13px] font-semibold tracking-[-0.005em]">
          {name}
        </span>
        <span className="text-[12.5px] tabular-nums text-[hsl(var(--muted-foreground))]">
          {priceLabel}
        </span>
      </div>
    </button>
  );
}
