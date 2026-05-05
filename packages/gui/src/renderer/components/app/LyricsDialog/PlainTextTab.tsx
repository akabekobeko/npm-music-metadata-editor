import { Textarea } from "@/components/ui/textarea";

/** Props for {@link PlainTextTab}. */
export type PlainTextTabProps = {
  readonly value: string;
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
  return (
    <Textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Paste plain-text lyrics here…"
      className="min-h-72 font-mono text-sm"
    />
  );
}
