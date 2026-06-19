export type UploadReceiptCopyInput = {
  fileCount?: number | null;
  sourceLinkCaptured?: boolean | null;
};

export function uploadReceiptCopy(receipt?: UploadReceiptCopyInput | null) {
  const isLinkOnly = Boolean(receipt?.sourceLinkCaptured && !receipt.fileCount);
  return {
    isLinkOnly,
    title: isLinkOnly ? "Link sent for review" : "Photos sent",
    resetLabel: isLinkOnly ? "Share another link or photos" : "Share more photos"
  };
}
