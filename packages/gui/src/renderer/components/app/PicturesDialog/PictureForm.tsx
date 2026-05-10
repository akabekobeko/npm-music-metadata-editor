import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocale } from "@/features/i18n/useLocale";
import {
  PICTURE_KIND_VALUES,
  PICTURE_MIME_OPTIONS,
  PICTURE_SIZE_WARNING_BYTES,
} from "@/features/pictures/constants";
import type { PictureDraft } from "@/features/pictures/types";

/** Props for {@link PictureForm}. */
export type PictureFormProps = {
  /** Currently-selected picture being edited. */
  readonly draft: PictureDraft;
  /** Update the picture's kind (cover, back, …). */
  readonly onChangeKind: (kind: PictureDraft["kind"]) => void;
  /** Update the picture's MIME type. */
  readonly onChangeMimeType: (mimeType: string) => void;
  /** Update the picture's description string. */
  readonly onChangeDescription: (description: string) => void;
};

/**
 * Convert a byte count to a human-readable size for the form's read-only
 * summary line.
 *
 * @param byteLength - Picture byte length.
 * @returns A short size label (e.g. `"12.3 KiB"`).
 */
const formatSize = (byteLength: number): string => {
  if (byteLength < 1024) {
    return `${byteLength} B`;
  }

  if (byteLength < 1024 * 1024) {
    return `${(byteLength / 1024).toFixed(1)} KiB`;
  }

  return `${(byteLength / (1024 * 1024)).toFixed(2)} MiB`;
};

/**
 * Right-pane edit form for a single picture.
 *
 * MIME type uses a dropdown for the four common types; an additional inline
 * `<Input>` accepts any value so unusual MIME strings (e.g.
 * `application/octet-stream`) can still be entered. Size is read-only — it
 * is derived from `draft.data.byteLength` and only changes on Replace.
 *
 * @returns The form markup.
 */
export function PictureForm({
  draft,
  onChangeKind,
  onChangeMimeType,
  onChangeDescription,
}: PictureFormProps) {
  const { t } = useLocale();
  const oversize = draft.data.byteLength >= PICTURE_SIZE_WARNING_BYTES;
  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">{t("pictures.kind")}</span>
        <Select
          value={String(draft.kind)}
          onValueChange={(next) => {
            if (next !== null) {
              onChangeKind(Number.parseInt(next, 10) as PictureDraft["kind"]);
            }
          }}
        >
          <SelectTrigger className="w-full" aria-label={t("pictures.kind")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PICTURE_KIND_VALUES.map((value) => (
              <SelectItem key={value} value={String(value)}>
                {t(`pictures.kind.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">{t("pictures.mimeType")}</span>
        <div className="flex gap-2">
          <Select
            value={draft.mimeType}
            onValueChange={(next) => {
              if (next !== null) {
                onChangeMimeType(next);
              }
            }}
          >
            <SelectTrigger className="w-40" aria-label={t("pictures.mimePreset")}>
              <SelectValue placeholder={t("pictures.mimePresetPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {PICTURE_MIME_OPTIONS.map((mime) => (
                <SelectItem key={mime} value={mime}>
                  {mime}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={draft.mimeType}
            onChange={(event) => onChangeMimeType(event.target.value)}
            placeholder={t("pictures.mimePlaceholder")}
            aria-label={t("pictures.mimeType")}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">{t("pictures.description")}</span>
        <Input
          value={draft.description}
          onChange={(event) => onChangeDescription(event.target.value)}
          placeholder=""
          aria-label={t("pictures.description")}
        />
      </div>
      <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
        <span>{t("pictures.size", { size: formatSize(draft.data.byteLength) })}</span>
        {oversize ? (
          <span className="text-destructive">{t("pictures.oversizeWarning")}</span>
        ) : null}
      </div>
    </div>
  );
}
