'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeftIcon } from '@phosphor-icons/react';

import { StoreProvider } from '@/src/lib/store';
import { Sidebar } from '../components/sidebar';
import { Button } from '../components/ui/button';

export default function NotFound() {
	return (
		<StoreProvider>
			<div className="min-h-dvh">
				<Sidebar />
				<div className="min-w-0 md:pl-64 lg:pl-84">
					<main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-16 text-center">
						{/* Soft decorative backdrop */}
						<div
							aria-hidden
							className="pointer-events-none absolute inset-0 [background:radial-gradient(60%_50%_at_50%_0%,var(--muted)_0%,transparent_70%)] opacity-60"
						/>

						<div className="relative flex max-w-md flex-col items-center">
							<Image
								src="/empty/404.png"
								alt=""
								aria-hidden
								width={200}
								height={200}
								priority
								className="size-44 select-none dark:invert sm:size-52"
							/>

							<p className="mt-4 text-sm font-medium tracking-wide text-muted-foreground">
								404 · Sayfa bulunamadı
							</p>

							<h1 className="mt-3 font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
								Burada bir şey yok
							</h1>

							<p className="mt-4 text-pretty text-muted-foreground">
								Aradığınız sayfa taşınmış veya hiç var olmamış
								olabilir. Soldaki menüden devam edebilir ya da
								ana sayfaya dönüp yeni bir hesaplama
								başlatabilirsiniz.
							</p>

							<div className="mt-8 flex flex-wrap items-center justify-center gap-2">
								<Button
									size="lg"
									nativeButton={false}
									render={<Link href="/" />}
									className="min-w-40"
								>
									<ArrowLeftIcon />
									Ana sayfaya dön
								</Button>
							</div>
						</div>
					</main>
				</div>
			</div>
		</StoreProvider>
	);
}
