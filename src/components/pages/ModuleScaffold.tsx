import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/pages/PageHeader";

export function ModuleScaffold({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="grid gap-8">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Coming next</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 pt-0">
            <p className="rounded-[12px] border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--background))] p-4 text-[13px] text-[hsl(var(--muted-foreground))]">
              This page is scaffolded so navigation works. The real UI and flows
              ship here next.
            </p>
            <Button variant="outline" className="w-fit" size="sm">
              Start building this module
              <ArrowRight />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Design notes</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-[13px] leading-relaxed text-[hsl(var(--muted-foreground))]">
            Calm surfaces, soft contrast and a restrained yellow for actions.
            Motion is barely felt; decoration whispers.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
