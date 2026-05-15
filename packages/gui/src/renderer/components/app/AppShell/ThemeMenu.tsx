import { Monitor, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocale } from "@/features/i18n/useLocale";
import type { ResolvedTheme, ThemePreference } from "@/features/theme/types";

/**
 * Radio entries shown inside the dropdown, in display order.
 *
 * `key` is the dictionary lookup; the literal value goes straight into
 * `AppSettings.theme` when the user picks the row.
 */
const ITEMS: ReadonlyArray<{ readonly value: ThemePreference; readonly key: string }> = [
  { value: "system", key: "header.theme.system" },
  { value: "light", key: "header.theme.light" },
  { value: "dark", key: "header.theme.dark" },
];

export type ThemeMenuProps = {
  /** Persisted preference; `undefined` is shown as `"system"`. */
  readonly value: ThemePreference | undefined;
  /** Resolved theme actually applied to the document — drives the trigger icon. */
  readonly resolved: ResolvedTheme;
  /** Commit a new preference back to the settings store. */
  readonly onChange: (value: ThemePreference) => void;
};

/**
 * Header dropdown that lets the user choose between Light / Dark / System.
 *
 * `"system"` follows `prefers-color-scheme`; `"light"` / `"dark"` pin the
 * resolved theme regardless of the OS setting (see
 * {@link import("@/features/theme/resolveTheme.js").resolveTheme}).
 */
export function ThemeMenu({ value, resolved, onChange }: ThemeMenuProps) {
  const { t } = useLocale();
  const current: ThemePreference = value ?? "system";
  const TriggerIcon = resolved === "dark" ? Moon : Sun;
  const label = t("header.theme");
  return (
    <DropdownMenu>
      <Tooltip>
        <DropdownMenuTrigger
          render={
            <TooltipTrigger
              render={
                <Button variant="ghost" size="icon-sm" className="w-auto px-3" aria-label={label}>
                  <TriggerIcon />
                </Button>
              }
            />
          }
        />
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuRadioGroup
          value={current}
          onValueChange={(next) => onChange(next as ThemePreference)}
        >
          {ITEMS.map((item) => (
            <DropdownMenuRadioItem key={item.value} value={item.value}>
              {iconFor(item.value)}
              {t(item.key)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Pick the leading icon for a radio item.
 *
 * Mirrors the trigger-side icon for `"light"` / `"dark"` and uses the
 * generic monitor glyph for `"system"` so the row reads as "follow the OS".
 *
 * @param value - Theme preference the row represents.
 * @returns The lucide icon to render.
 */
const iconFor = (value: ThemePreference) => {
  switch (value) {
    case "light":
      return <Sun />;
    case "dark":
      return <Moon />;
    case "system":
      return <Monitor />;
  }
};
