// Compute a SHA-256 hash for evidence content (data URL or string) to detect duplicates.

const toBytes = async (data: string): Promise<ArrayBuffer> => {
  // If it looks like a data URL, hash the underlying bytes for accuracy.
  if (data.startsWith('data:')) {
    const res = await fetch(data);
    const blob = await res.blob();
    return await blob.arrayBuffer();
  }
  return new TextEncoder().encode(data).buffer;
};

export const hashEvidence = async (data: string): Promise<string> => {
  try {
    const bytes = await toBytes(data);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (err) {
    console.error('hashEvidence failed:', err);
    // Fallback: cheap non-crypto signature so we still dedupe within a session.
    return `len:${data.length}`;
  }
};
