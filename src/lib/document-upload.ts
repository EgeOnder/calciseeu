/**
 * Computes the SHA-256 hex digest of a file's contents. The server uses this
 * to reject re-uploading a file the user already has.
 */
async function computeFileHash(file: File): Promise<string> {
	const buffer = await file.arrayBuffer();
	const digest = await crypto.subtle.digest('SHA-256', buffer);
	return Array.from(new Uint8Array(digest))
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('');
}

/**
 * Uploads a single file to R2 with progress, then records it in the database.
 * Shared by the automatic flow and the documents library so both upload the
 * same way: hash → presign (dedupe check) → direct PUT (with progress) →
 * confirm.
 *
 * Resolves with the saved document id once the upload has been confirmed, and
 * rejects (before touching R2) when the same file was already uploaded.
 */
export async function uploadDocument(
	file: File,
	onProgress: (progress: number) => void,
	registerXhr: (xhr: XMLHttpRequest | null) => void,
): Promise<string> {
	const hash = await computeFileHash(file);
	const meta = { name: file.name, size: file.size, type: file.type, hash };

	return new Promise<string>((resolve, reject) => {
		fetch('/api/documents/upload-url', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(meta),
		})
			.then(async (res) => {
				const payload = await res.json().catch(() => null);
				if (!res.ok) {
					throw new Error(payload?.error ?? 'Yükleme başlatılamadı.');
				}
				return payload as { id: string; uploadUrl: string };
			})
			.then(({ id, uploadUrl }) => {
				const xhr = new XMLHttpRequest();
				registerXhr(xhr);
				xhr.open('PUT', uploadUrl);
				xhr.setRequestHeader('Content-Type', file.type);

				xhr.upload.onprogress = (event) => {
					if (event.lengthComputable) {
						onProgress(event.loaded / event.total);
					}
				};

				xhr.onload = async () => {
					registerXhr(null);
					if (xhr.status < 200 || xhr.status >= 300) {
						reject(new Error('Dosya yüklenemedi.'));
						return;
					}
					try {
						const confirm = await fetch('/api/documents', {
							method: 'POST',
							headers: { 'content-type': 'application/json' },
							body: JSON.stringify({ id, ...meta }),
						});
						const payload = await confirm.json().catch(() => null);
						if (!confirm.ok) {
							throw new Error(
								payload?.error ?? 'Belge kaydedilemedi.',
							);
						}
						resolve(id);
					} catch (error) {
						reject(error as Error);
					}
				};

				xhr.onerror = () => {
					registerXhr(null);
					reject(new Error('Ağ hatası, dosya yüklenemedi.'));
				};
				xhr.onabort = () => {
					registerXhr(null);
					reject(
						new DOMException('Yükleme iptal edildi.', 'AbortError'),
					);
				};

				xhr.send(file);
			})
			.catch(reject);
	});
}
