import {
	DeleteObjectCommand,
	GetObjectCommand,
	HeadObjectCommand,
	PutObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * S3-compatible client pointed at the Cloudflare R2 bucket that stores
 * user-uploaded documents. R2 exposes an S3 API at the account endpoint and
 * expects `auto` as the region.
 */

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`${name} is required to talk to R2.`);
	}
	return value;
}

export const R2_BUCKET = process.env.R2_BUCKET ?? '';

let cachedClient: S3Client | null = null;

function getClient(): S3Client {
	if (cachedClient) return cachedClient;

	const accountId = requireEnv('R2_ACCOUNT_ID');
	cachedClient = new S3Client({
		region: 'auto',
		endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
		credentials: {
			accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
			secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
		},
	});
	return cachedClient;
}

/** Presigned PUT URL the browser uses to upload a document directly to R2. */
export function createUploadUrl(key: string, contentType: string) {
	return getSignedUrl(
		getClient(),
		new PutObjectCommand({
			Bucket: requireEnv('R2_BUCKET'),
			Key: key,
			ContentType: contentType,
		}),
		{ expiresIn: 60 * 5 },
	);
}

/** Presigned GET URL used to preview or download a stored document. */
export function createDownloadUrl(key: string) {
	return getSignedUrl(
		getClient(),
		new GetObjectCommand({
			Bucket: requireEnv('R2_BUCKET'),
			Key: key,
		}),
		{ expiresIn: 60 * 60 },
	);
}

/** Downloads a stored object's raw bytes (used to feed documents to the LLM). */
export async function getObjectBytes(key: string): Promise<Uint8Array> {
	const response = await getClient().send(
		new GetObjectCommand({
			Bucket: requireEnv('R2_BUCKET'),
			Key: key,
		}),
	);
	if (!response.Body) {
		throw new Error(`R2 object ${key} has no body.`);
	}
	return response.Body.transformToByteArray();
}

/** Confirms an object exists in R2 (used after a direct browser upload). */
export async function objectExists(key: string): Promise<boolean> {
	try {
		await getClient().send(
			new HeadObjectCommand({
				Bucket: requireEnv('R2_BUCKET'),
				Key: key,
			}),
		);
		return true;
	} catch {
		return false;
	}
}

/** Removes a document object from R2. */
export function deleteObject(key: string) {
	return getClient().send(
		new DeleteObjectCommand({
			Bucket: requireEnv('R2_BUCKET'),
			Key: key,
		}),
	);
}
