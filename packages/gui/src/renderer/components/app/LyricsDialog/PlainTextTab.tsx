import { Textarea } from "@/components/ui/textarea";
import { useLocale } from "@/features/i18n/useLocale";

/** Props for {@link PlainTextTab}. */
export type PlainTextTabProps = {
  /** Current unsynchronized lyrics text. */
  readonly value: string;
  /** Receive every keystroke; the parent owns the draft state. */
  readonly onChange: (value: string) => void;
};

/**
 * Plain-text editor tab inside the Lyrics dialog.
 *
 * Wraps the shared {@link Textarea} so the styling matches the rest of the
 * app; line breaks are preserved verbatim — trimming is the parent's job
 * via `buildLyricsInfoFromDraft`.
 *
 * @returns The textarea markup.
 */
export function PlainTextTab({ value, onChange }: PlainTextTabProps) {
  const { t } = useLocale();
  return (
    <Textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={t("lyrics.plainPlaceholder")}
      className="min-h-72 font-mono text-sm"
    />
  );
}
