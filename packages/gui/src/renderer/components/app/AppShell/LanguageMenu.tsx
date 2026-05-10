import { Languages } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocale } from "@/features/i18n/useLocale";
import type { LocalePreference } from "../../../../shared/locales/types.js";

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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm">
            <Languages />
            {t("header.language")}
          </Button>
        }
      />
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
