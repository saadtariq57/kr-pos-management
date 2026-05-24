"use client";

import Image from "next/image";
import * as React from "react";

import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  markClassName?: string;
  nameClassName?: string;
  src?: string;
  name?: string;
  showCaption?: boolean;
};

export function BrandMark({
  className,
  markClassName,
  nameClassName,
  src = "/logo.png",
  name = "KR Restaurant",
  showCaption = true,
}: BrandMarkProps) {
  const [imgOk, setImgOk] = React.useState(true);

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "relative grid size-9 place-items-center overflow-hidden rounded-[10px]",
          "border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]",
          markClassName,
        )}
      >
        {imgOk ? (
          <Image
            src={src}
            alt={`${name} logo`}
            fill
            sizes="36px"
            className="object-contain p-0.5"
            onError={() => setImgOk(false)}
            priority
          />
        ) : (
          <div className="text-[11px] font-semibold tracking-tight text-[hsl(var(--foreground))]">
            KR
          </div>
        )}
      </div>

      <div className={cn("min-w-0 leading-tight", nameClassName)}>
        <div className="truncate text-[14px] font-semibold tracking-[-0.01em]">
          {name}
        </div>
        {showCaption ? (
          <div className="truncate text-[11px] text-[hsl(var(--muted-foreground))]">
            POS &amp; Management
          </div>
        ) : null}
      </div>
    </div>
  );
}
