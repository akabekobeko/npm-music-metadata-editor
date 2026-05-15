import { Columns3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocale } from "@/features/i18n/useLocale";
import { ALL_COLUMN_IDS, COLUMN_REGISTRY } from "@/features/spreadsheet/constants";
import type { ColumnId } from "@/features/spreadsheet/types";

export type ColumnsMenuProps = {
  /** Column ids currently shown in the spreadsheet (in display order). */
  readonly visibleIds: readonly ColumnId[];
  /** Called when the user toggles a column on/off. */
  readonly onToggle: (id: ColumnId, visible: boolean) => void;
};

/**
 * Header dropdown that lets the user pick which columns appear in the grid.
 *
 * `fileName` is anchored on by design (it carries the row identity), so the
 * checkbox for it is rendered as disabled — the toggle never fires for that
 * id. The order in the menu matches `ALL_COLUMN_IDS` so users find the same
 * column at the same vertical position regardless of what is currently
 * visible.
 *
 * @param props - Component props.
 * @returns The dropdown trigger plus its checkbox menu.
 */
export function ColumnsMenu({ visibleIds, onToggle }: ColumnsMenuProps) {
  const { t } = useLocale();
  const visible = new Set(visibleIds);
  const label = t("header.columns");
  return (
    <DropdownMenu>
      <Tooltip>
        <DropdownMenuTrigger
          render={
            <TooltipTrigger
              render={
                <Button variant="ghost" size="icon-sm" className="w-auto px-3" aria-label={label}>
                  <Columns3 />
                </Button>
              }
            />
          }
        />
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-56">
        {ALL_COLUMN_IDS.map((id) => {
          const column = COLUMN_REGISTRY[id];
          const isFileName = id === "fileName";
          return (
            <DropdownMenuCheckboxItem
              key={id}
              checked={visible.has(id)}
              disabled={isFileName}
              closeOnClick={false}
              onCheckedChange={(checked) => {
                if (!isFileName) {
                  onToggle(id, checked === true);
                }
              }}
            >
              {column.title}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
