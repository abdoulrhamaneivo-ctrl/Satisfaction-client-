// Set this to the max file size you want to allow (currently 5MB).
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
// Durcissement (audit P6) : « text/* » acceptait n'importe quel type texte
// (html, svg-scriptable, javascript…) — remplacé par les formats explicitement
// nécessaires, listés un à un.
export const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv",
  "video/quicktime",
  "video/mp4",
] as const;
