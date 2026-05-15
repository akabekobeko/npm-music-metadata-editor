import { Languages } from "lucide-react";

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
import type { LocalePreference } from "../../../../shared/locales/types.js";

/**
 * Radio entries shown inside the dropdown, in display order.
 *
 * `key` is the dictionary lookup; the literal value goes straight into
 * `AppSettings.locale` when the user picks the row.
 */
const ITEMS: ReadonlyArray<{ readonly value: LocalePreference; readonly key: string }> = [
  { value: "system", key: "header.language.system" },
  { value: "en", key: "header.language.en" },
  { value: "ja", key: "header.language.ja" },
];

export type LanguageMenuProps = {
  /**
   * Persisted preference (`AppSettings.locale`). `undefined` is treated as
   * `"system"` so the dropdown indicator still highlights an item.
   */
  readonly value: LocalePreference | undefined;
  /** Commit a new preference back to the settings store. */
  readonly onChange: (value: LocalePreference) => void;
};

/**
 * Header dropdown that lets the user choose between English / Japanese / System.
 *
 * `"system"` defers to {@link import("../../../../shared/locales/resolveLocale.js").resolveLocale};
 * the persisted `"en"` / `"ja"` short-circuit the system signal so users can
 * pin a language regardless of OS settings.
 */
export function LanguageMenu({ value, onChange }: LanguageMenuProps) {
  const { t } = useLocale();
  const current: LocalePreference = value ?? "system";
  const label = t("header.language");
  return (
    <DropdownMenu>
      <Tooltip>
        <DropdownMenuTrigger
          render={
            <TooltipTrigger
              render={
                <Button variant="outline" size="icon-sm" aria-label={label}>
                  <Languages />
                </Button>
              }
            />
          }
        />
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuRadioGroup
          value={current}
          onValueChange={(next) => onChange(next as LocalePreference)}
        >
          {ITEMS.map((item) => (
            <DropdownMenuRadioItem key={item.value} value={item.value}>
              {t(item.key)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
