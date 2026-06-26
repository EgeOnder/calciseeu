/**
 * Shared rules for user-uploaded CAF documents. Imported by both the upload
 * UI and the API routes so the client and server agree on what is allowed.
 */

/** Largest accepted size for a single document, in bytes. */
export const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024;

/** Most documents a single user may keep uploaded at once. */
export const MAX_DOCUMENT_COUNT = 50;

/** MIME types we accept, mapped to their canonical file extension. */
export const ACCEPTED_DOCUMENT_TYPES: Record<string, string> = {
	'application/pdf': '.pdf',
	'image/jpeg': '.jpg',
	'image/png': '.png',
};

/** `accept` attribute value for the file input / drop zone. */
export const DOCUMENT_ACCEPT = 'application/pdf,image/jpeg,image/png';

/** Human-readable list shown in the upload hint. */
export const DOCUMENT_ACCEPT_LABEL = 'PDF, JPEG, JPG, PNG';

export type DocumentUploadInput = {
	name: string;
	size: number;
	type: string;
};

/** A SHA-256 digest rendered as 64 lowercase hex characters. */
const HASH_PATTERN = /^[0-9a-f]{64}$/;

/** True when the value looks like a SHA-256 hex digest we can dedupe on. */
export function isValidDocumentHash(value: unknown): value is string {
	return typeof value === 'string' && HASH_PATTERN.test(value);
}

/** Message shown when a user re-uploads a file they already have. */
export function duplicateDocumentMessage(existingName: string): string {
	return `Bu dosyayı daha önce yüklediniz: “${existingName}”.`;
}

/**
 * Validates the client-supplied metadata before we hand out a presigned URL.
 * Returns an error message, or null when the file is acceptable.
 */
export function validateDocumentInput(
	input: DocumentUploadInput,
): string | null {
	if (!input.name || input.name.length > 255) {
		return 'Geçersiz dosya adı.';
	}
	if (!ACCEPTED_DOCUMENT_TYPES[input.type]) {
		return 'Yalnızca PDF, JPEG, JPG ve PNG dosyaları yüklenebilir.';
	}
	if (!Number.isFinite(input.size) || input.size <= 0) {
		return 'Geçersiz dosya boyutu.';
	}
	if (input.size > MAX_DOCUMENT_SIZE) {
		return 'Dosya boyutu 5 MB sınırını aşıyor.';
	}
	return null;
}

/** Builds the R2 object key for a user's document. */
export function buildDocumentKey(userId: string, documentId: string): string {
	return `documents/${userId}/${documentId}`;
}

/**
 * Filters a set of dropped/selected files down to the ones we can accept,
 * honouring the type, per-file size, and overall count limits. Returns the
 * acceptable files plus human-readable reasons for any that were rejected.
 */
export function validateDroppedFiles(
	files: File[],
	existingCount: number,
): { accepted: File[]; errors: string[] } {
	const accepted: File[] = [];
	const errors: string[] = [];
	let count = existingCount;

	for (const file of files) {
		if (!ACCEPTED_DOCUMENT_TYPES[file.type]) {
			errors.push(
				`${file.name}: yalnızca PDF, JPEG, JPG ve PNG yüklenebilir.`,
			);
			continue;
		}
		if (file.size > MAX_DOCUMENT_SIZE) {
			errors.push(`${file.name}: 5 MB sınırını aşıyor.`);
			continue;
		}
		if (count >= MAX_DOCUMENT_COUNT) {
			errors.push(`En fazla ${MAX_DOCUMENT_COUNT} belge yükleyebilirsiniz.`);
			break;
		}
		accepted.push(file);
		count += 1;
	}

	return { accepted, errors };
}
