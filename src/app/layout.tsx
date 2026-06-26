import type { Metadata, Viewport } from 'next';
import { Instrument_Sans } from 'next/font/google';
import { headers } from 'next/headers';
import type { ReactNode } from 'react';

import { ThemeProvider } from 'next-themes';

import { Toaster } from '@/src/components/ui/sonner';
import { auth } from '@/src/lib/auth';
import { SessionProvider, type AppSession } from '@/src/lib/session';
import '../globals.css';

const instrumentSans = Instrument_Sans({
	subsets: ['latin', 'latin-ext'],
	display: 'swap',
	variable: '--font-instrument-sans',
});

const siteUrl = 'https://calciseeu.vercel.app';
const title = 'ISEEU Hesaplama 2026 | DSU Bursu İçin Türkçe ISEE Parificato';
const description =
	'Türk öğrenciler için ISEEU hesaplama ve ISEE Parificato tahmin aracı. Polimi DSU, İtalya üniversite bursları, CAF süreci, gelir ve varlık adımlarını Türkçe takip edin.';

const jsonLd = {
	'@context': 'https://schema.org',
	'@graph': [
		{
			'@type': 'WebApplication',
			'@id': `${siteUrl}/#app`,
			name: 'Calc ISEEU',
			alternateName: [
				'ISEEU Hesaplama',
				'ISEE Hesaplama',
				'ISEE Parificato Hesaplama',
			],
			url: `${siteUrl}/`,
			applicationCategory: 'FinanceApplication',
			operatingSystem: 'Web',
			inLanguage: 'tr-TR',
			description:
				'Türk öğrenciler için ISEEU Parificato ve DSU burs başvurusu tahmin aracı.',
			offers: {
				'@type': 'Offer',
				price: '0',
				priceCurrency: 'EUR',
			},
			audience: {
				'@type': 'Audience',
				audienceType: "İtalya'da DSU bursuna başvuran Türk öğrenciler",
			},
		},
		{
			'@type': 'FAQPage',
			'@id': `${siteUrl}/#faq`,
			mainEntity: [
				{
					'@type': 'Question',
					name: 'ISEEU hesaplama nedir?',
					acceptedAnswer: {
						'@type': 'Answer',
						text: "ISEEU hesaplama, İtalya'daki üniversite burslarında kullanılan ISEE Parificato değerini gelir, taşınır varlık, taşınmaz varlık ve hane bilgileriyle tahmini olarak hesaplama sürecidir.",
					},
				},
				{
					'@type': 'Question',
					name: 'Bu araç Polimi DSU için kullanılabilir mi?',
					acceptedAnswer: {
						'@type': 'Answer',
						text: 'Bu araç Polimi DSU ve benzeri İtalya üniversite burs süreçleri için tahmini hazırlık sağlar. Resmi sonucu yalnızca üniversitenin kabul ettiği CAF merkezi hesaplar.',
					},
				},
				{
					'@type': 'Question',
					name: 'Türk öğrenciler ISEE Parificato için hangi bilgileri hazırlar?',
					acceptedAnswer: {
						'@type': 'Answer',
						text: 'Genellikle hane bilgileri, gelir belgeleri, banka ve yatırım bakiyeleri, gayrimenkul bilgileri ve ilgili yılın döviz kuru gerekir. Üniversite ve CAF talimatları nihai belirleyicidir.',
					},
				},
			],
		},
	],
};

export const metadata: Metadata = {
	metadataBase: new URL(siteUrl),
	applicationName: 'Calc ISEEU',
	title,
	description,
	authors: [{ name: 'Calc ISEEU' }],
	keywords: [
		'ISEEU hesaplama',
		'ISEE hesaplama',
		'ISEE Parificato hesaplama',
		'DSU bursu',
		'Polimi DSU',
		'İtalya burs hesaplama',
		'Türk öğrenciler İtalya',
	],
	manifest: '/favicon/site.webmanifest',
	alternates: {
		canonical: '/',
		languages: {
			tr: '/',
		},
	},
	robots: 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
	icons: {
		icon: [
			{ url: '/favicon/favicon.ico', sizes: 'any' },
			{
				url: '/favicon/favicon-32x32.png',
				type: 'image/png',
				sizes: '32x32',
			},
			{
				url: '/favicon/favicon-16x16.png',
				type: 'image/png',
				sizes: '16x16',
			},
		],
		apple: '/favicon/apple-touch-icon.png',
	},
	openGraph: {
		locale: 'tr_TR',
		type: 'website',
		siteName: 'Calc ISEEU',
		title: 'ISEEU Hesaplama | Türk Öğrenciler İçin DSU ve ISEE Parificato',
		description:
			'Polimi DSU ve İtalya üniversite bursları için ISEEU Parificato değerinizi Türkçe adımlarla tahmin edin.',
		url: '/',
		images: [
			{
				url: '/og.png',
				type: 'image/png',
				alt: 'ISEEU hesaplama ve DSU bursu için Türkçe tahmin aracı',
			},
		],
	},
	twitter: {
		card: 'summary_large_image',
		title: 'ISEEU Hesaplama | DSU Bursu İçin Türkçe Araç',
		description:
			'Türk öğrenciler için ISEE Parificato, ISEEU ve DSU burs başvurusu tahmin aracı.',
		images: ['/og.png'],
	},
};

export const viewport: Viewport = {
	themeColor: [
		{ media: '(prefers-color-scheme: light)', color: '#ffffff' },
		{ media: '(prefers-color-scheme: dark)', color: '#252525' },
	],
};

export default async function RootLayout({
	children,
}: {
	children: ReactNode;
}) {
	const result = await auth.api
		.getSession({ headers: await headers() })
		.catch(() => null);
	const initialSession: AppSession = result
		? {
				user: {
					name: result.user.name,
					email: result.user.email,
					image: result.user.image,
					isPro: result.user.isPro,
				},
			}
		: null;

	return (
		<html
			lang="tr"
			className={instrumentSans.variable}
			suppressHydrationWarning
		>
			<body>
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{
						__html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
					}}
				/>
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
				>
					<SessionProvider initialSession={initialSession}>
						{children}
					</SessionProvider>
					<Toaster />
				</ThemeProvider>
			</body>
		</html>
	);
}
