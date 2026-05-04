// Evidence upload validation rules

export const EVIDENCE_LIMITS = {
  maxFiles: 5,
  maxFileSizeBytes: 25 * 1024 * 1024, // 25 MB per file
  maxTotalSizeBytes: 75 * 1024 * 1024, // 75 MB total
  allowedMimePrefixes: ['image/', 'video/', 'audio/'],
  allowedTypes: ['photo', 'video', 'audio'] as const,
} as const;

export type EvidenceType = (typeof EVIDENCE_LIMITS.allowedTypes)[number];

export interface CapturedEvidence {
  type: EvidenceType;
  size?: number;
  data?: string; // data URL or mime hint
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const getMimeFromDataUrl = (data?: string): string | null => {
  if (!data) return null;
  const m = data.match(/^data:([^;]+);/);
  return m ? m[1] : null;
};

export const validateSingleEvidence = (item: CapturedEvidence): ValidationResult => {
  if (!EVIDENCE_LIMITS.allowedTypes.includes(item.type)) {
    return { valid: false, error: `Unsupported file type: ${item.type}` };
  }

  const mime = getMimeFromDataUrl(item.data);
  if (mime && !EVIDENCE_LIMITS.allowedMimePrefixes.some((p) => mime.startsWith(p))) {
    return { valid: false, error: `File format not allowed (${mime})` };
  }

  if (item.size && item.size > EVIDENCE_LIMITS.maxFileSizeBytes) {
    return {
      valid: false,
      error: `File exceeds ${EVIDENCE_LIMITS.maxFileSizeBytes / 1024 / 1024} MB limit`,
    };
  }

  return { valid: true };
};

export const validateEvidenceCollection = (
  items: Array<{ type: string; size?: number }>
): ValidationResult => {
  if (items.length > EVIDENCE_LIMITS.maxFiles) {
    return {
      valid: false,
      error: `Maximum ${EVIDENCE_LIMITS.maxFiles} files allowed (you have ${items.length})`,
    };
  }

  for (const item of items) {
    if (!EVIDENCE_LIMITS.allowedTypes.includes(item.type as EvidenceType)) {
      return { valid: false, error: `Unsupported file type: ${item.type}` };
    }
    if (item.size && item.size > EVIDENCE_LIMITS.maxFileSizeBytes) {
      return {
        valid: false,
        error: `A file exceeds the ${EVIDENCE_LIMITS.maxFileSizeBytes / 1024 / 1024} MB per-file limit`,
      };
    }
  }

  const totalSize = items.reduce((sum, i) => sum + (i.size || 0), 0);
  if (totalSize > EVIDENCE_LIMITS.maxTotalSizeBytes) {
    return {
      valid: false,
      error: `Total uploads exceed ${EVIDENCE_LIMITS.maxTotalSizeBytes / 1024 / 1024} MB`,
    };
  }

  return { valid: true };
};
