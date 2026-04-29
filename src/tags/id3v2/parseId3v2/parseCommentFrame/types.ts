/** Result of parsing a `COMM` (or `USLT`) frame body. */
export type CommentFrame = {
  /** ISO-639 3-character language code, lower-case. */
  language: string;
  /** Short content descriptor, often empty. */
  description: string;
  /** Comment text. */
  text: string;
};
