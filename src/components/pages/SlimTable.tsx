"use client";

import * as React from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type SlimColumn<T> = {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
};

export function SlimTable<T>({
  columns,
  rows,
  empty,
  className,
  rowKey,
}: {
  columns: SlimColumn<T>[];
  rows: T[];
  empty?: React.ReactNode;
  className?: string;
  rowKey?: (row: T) => React.Key;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[12px] border border-[hsl(var(--border))]",
        className,
      )}
    >
      <Table className="min-w-full">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((c) => (
              <TableHead
                key={c.key}
                className={cn(
                  c.align === "right" && "text-right",
                  c.align === "center" && "text-center",
                  c.className,
                )}
              >
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={columns.length}
                className="py-10 text-center text-[13px] text-[hsl(var(--muted-foreground))]"
              >
                {empty ?? "No data yet."}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, idx) => (
              <TableRow key={rowKey?.(row) ?? idx}>
                {columns.map((c) => (
                  <TableCell
                    key={c.key}
                    className={cn(
                      c.align === "right" && "text-right",
                      c.align === "center" && "text-center",
                      c.className,
                    )}
                  >
                    {c.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
