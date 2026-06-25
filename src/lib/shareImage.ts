import { formatEur, formatNumber, type IseeuResult } from '@/src/lib/iseeu';

// Square card — works well across most social platforms.
const SIZE = 1080;
const FONT = '"Instrument Sans Variable", system-ui, sans-serif';

interface Palette {
	bg: string;
	card: string;
	border: string;
	text: string;
	muted: string;
	heroBg: string;
	heroText: string;
	heroMuted: string;
}

const LIGHT: Palette = {
	bg: '#ffffff',
	card: '#fafafa',
	border: '#e5e5e5',
	text: '#171717',
	muted: '#737373',
	heroBg: '#171717',
	heroText: '#ffffff',
	heroMuted: 'rgba(255,255,255,0.65)',
};

const DARK: Palette = {
	bg: '#0a0a0a',
	card: '#171717',
	border: '#262626',
	text: '#fafafa',
	muted: '#a3a3a3',
	heroBg: '#fafafa',
	heroText: '#0a0a0a',
	heroMuted: 'rgba(10,10,10,0.6)',
};

function roundRect(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	r: number,
) {
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.arcTo(x + w, y, x + w, y + h, r);
	ctx.arcTo(x + w, y + h, x, y + h, r);
	ctx.arcTo(x, y + h, x, y, r);
	ctx.arcTo(x, y, x + w, y, r);
	ctx.closePath();
}

/** Make sure the variable font is loaded before drawing to canvas. */
async function ensureFonts() {
	try {
		if (!document.fonts) return;
		await Promise.all([
			document.fonts.load(`600 64px ${FONT}`),
			document.fonts.load(`500 30px ${FONT}`),
			document.fonts.load(`400 26px ${FONT}`),
		]);
		await document.fonts.ready;
	} catch {
		/* fall back to system font */
	}
}

/** Renders a shareable summary card for the result and returns a PNG blob. */
export async function renderShareCard(
	result: IseeuResult,
	dark: boolean,
): Promise<Blob> {
	await ensureFonts();

	const p = dark ? DARK : LIGHT;
	const canvas = document.createElement('canvas');
	canvas.width = SIZE;
	canvas.height = SIZE;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Canvas 2D context unavailable');

	// Background
	ctx.fillStyle = p.bg;
	ctx.fillRect(0, 0, SIZE, SIZE);

	const pad = 80;
	const innerW = SIZE - pad * 2;

	// Brand line
	ctx.textBaseline = 'alphabetic';
	ctx.fillStyle = p.muted;
	ctx.font = `600 24px ${FONT}`;
	ctx.fillText('ISEEU HESAPLAMA', pad, pad + 24);

	// Title
	ctx.fillStyle = p.text;
	ctx.font = `600 52px ${FONT}`;
	ctx.fillText('Tahmini Sonuç', pad, pad + 92);

	// Hero cards (ISEEU + ISPEU)
	const heroY = pad + 130;
	const heroH = 290;
	const gap = 28;
	const heroW = (innerW - gap) / 2;

	// ISEEU (accent)
	roundRect(ctx, pad, heroY, heroW, heroH, 32);
	ctx.fillStyle = p.heroBg;
	ctx.fill();
	ctx.fillStyle = p.heroMuted;
	ctx.font = `600 22px ${FONT}`;
	ctx.fillText('ISEEU (TAHMİNİ)', pad + 36, heroY + 64);
	ctx.fillStyle = p.heroText;
	ctx.font = `600 60px ${FONT}`;
	ctx.fillText(formatEur(result.iseeu, true), pad + 36, heroY + 150);
	ctx.fillStyle = p.heroMuted;
	ctx.font = `400 22px ${FONT}`;
	ctx.fillText('ISE ÷ eşdeğerlik katsayısı', pad + 36, heroY + heroH - 40);

	// ISPEU (outline)
	const hero2X = pad + heroW + gap;
	roundRect(ctx, hero2X, heroY, heroW, heroH, 32);
	ctx.fillStyle = p.card;
	ctx.fill();
	ctx.lineWidth = 2;
	ctx.strokeStyle = p.border;
	roundRect(ctx, hero2X, heroY, heroW, heroH, 32);
	ctx.stroke();
	ctx.fillStyle = p.muted;
	ctx.font = `600 22px ${FONT}`;
	ctx.fillText('ISPEU (TAHMİNİ)', hero2X + 36, heroY + 64);
	ctx.fillStyle = p.text;
	ctx.font = `600 60px ${FONT}`;
	ctx.fillText(formatEur(result.ispeu, true), hero2X + 36, heroY + 150);
	ctx.fillStyle = p.muted;
	ctx.font = `400 22px ${FONT}`;
	ctx.fillText('ISP ÷ eşdeğerlik katsayısı', hero2X + 36, heroY + heroH - 40);

	// Breakdown rows
	const rows: [string, string][] = [
		['ISR — gelir göstergesi', formatEur(result.isr, true)],
		['ISP — varlık göstergesi', formatEur(result.isp, true)],
		['ISE', formatEur(result.ise, true)],
		[
			'Eşdeğerlik katsayısı',
			`${formatNumber(result.coefficient)} · ${result.size} kişi`,
		],
	];

	let rowY = heroY + heroH + 70;
	const rowH = 72;
	ctx.textBaseline = 'middle';
	rows.forEach(([label, value], i) => {
		const cy = rowY + rowH / 2;
		ctx.fillStyle = p.text;
		ctx.font = `500 28px ${FONT}`;
		ctx.textAlign = 'left';
		ctx.fillText(label, pad, cy);
		ctx.fillStyle = p.text;
		ctx.font = `600 30px ${FONT}`;
		ctx.textAlign = 'right';
		ctx.fillText(value, SIZE - pad, cy);
		ctx.textAlign = 'left';
		// divider
		if (i < rows.length - 1) {
			ctx.strokeStyle = p.border;
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(pad, rowY + rowH);
			ctx.lineTo(SIZE - pad, rowY + rowH);
			ctx.stroke();
		}
		rowY += rowH;
	});

	// Footer disclaimer
	ctx.textBaseline = 'alphabetic';
	ctx.fillStyle = p.muted;
	ctx.font = `400 22px ${FONT}`;
	const disclaimer =
		'Tahmini sonuçtur · resmî CAF hesaplamasının yerine geçmez.';
	wrapText(ctx, disclaimer, pad, SIZE - pad - 18, innerW, 30);

	return await new Promise<Blob>((resolve, reject) => {
		canvas.toBlob(
			(blob) =>
				blob ? resolve(blob) : reject(new Error('toBlob failed')),
			'image/png',
		);
	});
}

function wrapText(
	ctx: CanvasRenderingContext2D,
	text: string,
	x: number,
	y: number,
	maxWidth: number,
	lineHeight: number,
) {
	const words = text.split(' ');
	const lines: string[] = [];
	let line = '';
	for (const word of words) {
		const test = line ? `${line} ${word}` : word;
		if (ctx.measureText(test).width > maxWidth && line) {
			lines.push(line);
			line = word;
		} else {
			line = test;
		}
	}
	if (line) lines.push(line);
	// Draw from the bottom up so the last line sits at y
	lines.forEach((l, i) => {
		ctx.fillText(l, x, y - (lines.length - 1 - i) * lineHeight);
	});
}

const SHARE_FILENAME = 'iseeu-tahmini-sonuc.png';
const SHARE_TITLE = 'ISEEU Tahmini Sonucum';
const SHARE_TEXT = 'ISEEU Parificato tahmini sonucum (resmî değildir).';

/** Whether the browser can share image files via the Web Share API. */
export function canShareImageFiles(): boolean {
	try {
		const file = new File([new Blob()], SHARE_FILENAME, {
			type: 'image/png',
		});
		return (
			typeof navigator !== 'undefined' &&
			!!navigator.canShare &&
			navigator.canShare({ files: [file] })
		);
	} catch {
		return false;
	}
}

/**
 * Shares the image via the native share sheet.
 * Returns true if shared (or cancelled by the user), false if sharing is unavailable.
 */
export async function shareImageFile(blob: Blob): Promise<boolean> {
	const file = new File([blob], SHARE_FILENAME, { type: 'image/png' });
	if (!navigator.canShare || !navigator.canShare({ files: [file] })) {
		return false;
	}
	try {
		await navigator.share({
			files: [file],
			title: SHARE_TITLE,
			text: SHARE_TEXT,
		});
		return true;
	} catch (err) {
		// User cancelled the share sheet — not an error worth surfacing.
		if (err instanceof DOMException && err.name === 'AbortError')
			return true;
		return false;
	}
}

/** Triggers a download of the image as a fallback to native sharing. */
export function downloadImage(blob: Blob) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = SHARE_FILENAME;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}
