import { useEffect, useState } from "react";

/** Props for {@link PicturePreview}. */
export type PicturePreviewProps = {
  /** Raw image bytes; used to mint the object URL. */
  readonly bytes: Uint8Array;
  /** MIME type passed to the `Blob` so the browser decodes correctly. */
  readonly mimeType: string;
};

/**
 * Render a `<img>` whose `src` is an object URL minted from the draft bytes.
 *
 * The hook lifecycle handles `URL.createObjectURL` / `URL.revokeObjectURL`
 * so the component never leaks blob URLs even when the user cycles through
 * a long list of pictures. `onError` switches to a textual fallback when
 * the bytes cannot be decoded as an image.
 *
 * @returns The preview markup.
 */
export function PicturePreview({ bytes, mimeType }: PicturePreviewProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setErrored(false);
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    const blob = new Blob([buffer], { type: mimeType });
    const url = URL.createObjectURL(blob);
    setSrc(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [bytes, mimeType]);

  if (errored) {
    return (
      <div className="flex h-48 items-center justify-center rounded-md border bg-muted/50 text-xs text-muted-foreground">
        Cannot display as an image
      </div>
    );
  }

  if (src === null) {
    return <div className="h-48 rounded-md border bg-muted/50" aria-busy="true" />;
  }

  return (
    <img
      src={src}
      alt="Embedded artwork"
      onError={() => setErrored(true)}
      className="max-h-64 w-full rounded-md border bg-muted/50 object-contain"
    />
  );
}
