import { Monitor, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocale } from "@/features/i18n/useLocale";
import type { ResolvedTheme, ThemePreference } from "@/features/theme/types";

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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm">
            <TriggerIcon />
            {t("header.theme")}
          </Button>
        }
      />
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
