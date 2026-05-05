import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PICTURE_KIND_OPTIONS,
  PICTURE_MIME_OPTIONS,
  PICTURE_SIZE_WARNING_BYTES,
} from "@/features/pictures/constants";
import type { PictureDraft } from "@/features/pictures/types";

/** Props for {@link PictureForm}. */
export type PictureFormProps = {
  readonly draft: PictureDraft;
  readonly onChangeKind: (kind: PictureDraft["kind"]) => void;
  readonly onChangeMimeType: (mimeType: string) => void;
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
  const oversize = draft.data.byteLength >= PICTURE_SIZE_WARNING_BYTES;
  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Kind</span>
        <Select
          value={String(draft.kind)}
          onValueChange={(next) => {
            if (next !== null) {
              onChangeKind(Number.parseInt(next, 10) as PictureDraft["kind"]);
            }
          }}
        >
          <SelectTrigger className="w-full" aria-label="Picture kind">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PICTURE_KIND_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={String(option.value)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">MIME type</span>
        <div className="flex gap-2">
          <Select
            value={draft.mimeType}
            onValueChange={(next) => {
              if (next !== null) {
                onChangeMimeType(next);
              }
            }}
          >
            <SelectTrigger className="w-40" aria-label="MIME type preset">
              <SelectValue placeholder="Pick" />
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
            placeholder="image/jpeg"
            aria-label="MIME type"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Description</span>
        <Input
          value={draft.description}
          onChange={(event) => onChangeDescription(event.target.value)}
          placeholder=""
          aria-label="Picture description"
        />
      </div>
      <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
        <span>Size: {formatSize(draft.data.byteLength)}</span>
        {oversize ? (
          <span className="text-destructive">
            Embedding pictures over 5 MiB inflates tag size — consider resizing.
          </span>
        ) : null}
      </div>
    </div>
  );
}
