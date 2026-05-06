import { useEffect, useState } from "react";

/** Args for {@link usePicturePreview}. */
type Args = {
  /** Raw image bytes; used to mint the object URL. */
  readonly bytes: Uint8Array;
  /** MIME type passed to the `Blob` so the browser decodes correctly. */
  readonly mimeType: string;
};

/** Public surface returned by {@link usePicturePreview}. */
export type PicturePreviewState = {
  /** Object URL backing the `<img>` `src`, or `null` while initialising. */
  readonly src: string | null;
  /** Whether the browser failed to decode the bytes as an image. */
  readonly errored: boolean;
  /** `onError` handler attached to the `<img>` to flip the fallback on. */
  readonly handleError: () => void;
};

/**
 * Manage the object-URL lifecycle that backs the picture preview `<img>`.
 *
 * Allocates a fresh `URL.createObjectURL` whenever the bytes / MIME type
 * change and revokes the previous one, so the component never leaks blob
 * URLs even when the user cycles through a long list of pictures.
 *
 * @param args - Bytes and MIME type to render.
 * @returns The view-model the component renders against.
 */
export const usePicturePreview = ({ bytes, mimeType }: Args): PicturePreviewState => {
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

  const handleError = (): void => setErrored(true);

  return { src, errored, handleError };
};
