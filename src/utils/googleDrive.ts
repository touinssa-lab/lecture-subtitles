/**
 * Utility for parsing and formatting Google Drive links for PDF viewer and direct downloads.
 */

export interface GoogleDriveFileInfo {
  fileId: string | null;
  downloadUrl: string;
  previewUrl: string;
  viewUrl: string;
  originalUrl: string;
}

/**
 * Extracts Google Drive File ID from various Google Drive link formats.
 * Examples supported:
 * - https://drive.google.com/file/d/1A2B3C4D5E/view?usp=sharing
 * - https://drive.google.com/open?id=1A2B3C4D5E
 * - https://drive.google.com/uc?id=1A2B3C4D5E
 * - 1A2B3C4D5E (Raw ID)
 */
export function extractGoogleDriveFileId(urlOrId: string): string | null {
  if (!urlOrId || typeof urlOrId !== 'string') return null;

  const trimmed = urlOrId.trim();

  // If it's already just an ID (alphanumeric, dashes, underscores, length ~25-50)
  if (/^[a-zA-Z0-9_-]{25,50}$/.test(trimmed)) {
    return trimmed;
  }

  // Match /file/d/FILE_ID/
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) {
    return fileDMatch[1];
  }

  // Match id=FILE_ID
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch && idParamMatch[1]) {
    return idParamMatch[1];
  }

  return null;
}

/**
 * Generates Google Drive file information given a link or file ID.
 */
export function parseGoogleDriveUrl(urlOrId: string): GoogleDriveFileInfo {
  const fileId = extractGoogleDriveFileId(urlOrId);

  if (!fileId) {
    return {
      fileId: null,
      downloadUrl: urlOrId,
      previewUrl: urlOrId,
      viewUrl: urlOrId,
      originalUrl: urlOrId,
    };
  }

  return {
    fileId,
    downloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
    previewUrl: `https://drive.google.com/file/d/${fileId}/preview`,
    viewUrl: `https://drive.google.com/file/d/${fileId}/view?usp=sharing`,
    originalUrl: urlOrId,
  };
}

/**
 * Generates a QR Code image URL using the free, reliable QR Server API.
 */
export function getQrCodeImageUrl(contentUrl: string, size: number = 300): string {
  const encoded = encodeURIComponent(contentUrl);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`;
}
