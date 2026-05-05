import { AlertCircle, AlertTriangle, Info } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { summarizeWarnings, type WarningsSummary } from "@/features/tracks/summarizeWarnings";
import type { TrackRow } from "@/features/tracks/types";
import { cn } from "@/libs/utils";

/** Props for {@link WarningsCell}. */
export type WarningsCellProps = {
  readonly row: TrackRow;
};

/**
 * Cell rendering the row's warning count tinted by the highest severity.
 *
 * Hovering the cell opens a tooltip listing every warning message so users can
 * triage the row without leaving the spreadsheet view.
 *
 * @param props - Cell props.
 * @returns The cell content.
 */
export function WarningsCell({ row }: WarningsCellProps) {
  const summary = summarizeWarnings(row.track.warnings);
  if (summary.count === 0) {
    return <span className="text-muted-foreground/40">—</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn(
              "inline-flex items-center gap-1 tabular-nums",
              colorOf(summary.maxSeverity),
            )}
          >
            <SeverityIcon severity={summary.maxSeverity} />
            <span>{summary.count}</span>
          </span>
        }
      />
      <TooltipContent>
        <pre className="whitespace-pre-wrap font-sans">{summary.messages.join("\n")}</pre>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Tailwind color class for the severity-tinted cell foreground.
 *
 * @param severity - Highest severity in the warning list.
 * @returns Class name applied to the cell wrapper.
 */
const colorOf = (severity: WarningsSummary["maxSeverity"]): string => {
  if (severity === "error") {
    return "text-destructive";
  }

  if (severity === "warn") {
    return "text-amber-600 dark:text-amber-400";
  }

  return "text-muted-foreground";
};

/**
 * Pick the lucide icon matching the given severity.
 *
 * @param props - Severity from the warnings summary.
 * @returns A lucide icon component sized for cells.
 */
const SeverityIcon = ({ severity }: { severity: WarningsSummary["maxSeverity"] }) => {
  if (severity === "error") {
    return <AlertCircle className="size-3.5" />;
  }

  if (severity === "warn") {
    return <AlertTriangle className="size-3.5" />;
  }

  return <Info className="size-3.5" />;
};
