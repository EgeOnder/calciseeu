'use client';

import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ChangeEvent,
} from 'react';
import { nanoid } from 'nanoid';
import type { ChatStatus } from 'ai';
import Fuse from 'fuse.js';
import {
	CheckIcon,
	FilePdfIcon,
	FolderOpenIcon,
	MagnifyingGlassIcon,
	UploadSimpleIcon,
} from '@phosphor-icons/react';
import { PaperclipIcon } from 'lucide-react';
import { toast } from 'sonner';

import { MessageResponse } from './ai-elements/message';
import { Marker, MarkerContent } from './ui/marker';
import { Message, MessageContent } from './ui/message';
import {
	MessageScroller,
	MessageScrollerButton,
	MessageScrollerContent,
	MessageScrollerItem,
	MessageScrollerProvider,
	MessageScrollerViewport,
} from './ui/message-scroller';
import {
	PromptInput,
	PromptInputBody,
	PromptInputButton,
	PromptInputFooter,
	PromptInputSubmit,
	PromptInputTextarea,
	PromptInputTools,
	type PromptInputMessage,
} from './ai-elements/prompt-input';
import { Shimmer } from './ai-elements/shimmer';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';
import type {
	AutomaticChatMessage,
	AutomaticDocumentRef,
} from '@/src/lib/automatic';
import {
	fetchDocuments,
	type LibraryDocument,
} from '@/src/lib/document-library';
import { uploadDocument } from '@/src/lib/document-upload';
import {
	DOCUMENT_ACCEPT,
	MAX_DOCUMENT_COUNT,
	validateDroppedFiles,
} from '@/src/lib/documents';
import { formatBytes } from '@/src/hooks/use-file-upload';
import { LoginPromptDialog } from '@/src/components/login-prompt-dialog';
import { useAppSession } from '@/src/lib/session';

type AutomaticAgentEvent = 'start' | 'documents_changed';

export function AutomaticChat({
	calculationId,
	documents,
	initialMessages,
	onDocumentsUploaded,
	onCalculationUpdated,
	className,
}: {
	calculationId: string | null;
	documents: AutomaticDocumentRef[];
	initialMessages: AutomaticChatMessage[];
	onDocumentsUploaded: (
		documents: AutomaticDocumentRef[],
	) => Promise<boolean>;
	onCalculationUpdated?: () => void | Promise<void>;
	className?: string;
}) {
	const { session } = useAppSession();
	const isSignedIn = !!session;
	const [loginPromptOpen, setLoginPromptOpen] = useState(false);
	const [messages, setMessages] =
		useState<AutomaticChatMessage[]>(initialMessages);
	const [input, setInput] = useState('');
	const [status, setStatus] = useState<ChatStatus>('ready');
	const [uploadingDocuments, setUploadingDocuments] = useState(false);
	const [pickerOpen, setPickerOpen] = useState(false);
	const [library, setLibrary] = useState<LibraryDocument[] | null>(null);
	const [librarySearch, setLibrarySearch] = useState('');
	const [picked, setPicked] = useState<Set<string>>(new Set());
	const documentInputRef = useRef<HTMLInputElement>(null);
	const initialRequestStarted = useRef(false);
	const abortController = useRef<AbortController | null>(null);
	const statusRef = useRef<ChatStatus>('ready');
	const pendingDocumentRecalculation = useRef(false);
	const selectedDocumentIds = useMemo(
		() => new Set(documents.map((document) => document.id)),
		[documents],
	);
	const availableLibrary = useMemo(
		() =>
			library?.filter(
				(document) => !selectedDocumentIds.has(document.id),
			) ?? [],
		[library, selectedDocumentIds],
	);
	const libraryFuse = useMemo(
		() => new Fuse(availableLibrary, { keys: ['name'], threshold: 0.4 }),
		[availableLibrary],
	);
	const visibleLibrary = useMemo(() => {
		const query = librarySearch.trim();
		return query
			? libraryFuse.search(query).map(({ item }) => item)
			: availableLibrary;
	}, [availableLibrary, libraryFuse, librarySearch]);

	useEffect(
		() => () => {
			abortController.current?.abort();
		},
		[],
	);

	const streamAssistant = useCallback(
		async (
			userMessage?: AutomaticChatMessage,
			event?: AutomaticAgentEvent,
		) => {
			if (!isSignedIn) {
				setLoginPromptOpen(true);
				return;
			}
			if (!calculationId) {
				toast.error('Sohbet başlatılamadı', {
					description: 'Otomatik hesaplama önce kaydedilmelidir.',
				});
				return;
			}

			statusRef.current = 'submitted';
			setStatus('submitted');
			const controller = new AbortController();
			abortController.current = controller;
			const assistantId = nanoid();
			let assistantText = '';
			let assistantAdded = false;

			try {
				const response = await fetch('/api/automatic/chat', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						calculationId,
						event: event ?? null,
						message: userMessage
							? { id: userMessage.id, text: userMessage.text }
							: null,
					}),
					signal: controller.signal,
				});
				if (response.status === 401) {
					setLoginPromptOpen(true);
					return;
				}
				if (!response.ok || !response.body) {
					const payload = (await response.json().catch(() => null)) as {
						error?: string;
					} | null;
					throw new Error(payload?.error ?? 'Yanıt alınamadı.');
				}

				statusRef.current = 'streaming';
				setStatus('streaming');
				const reader = response.body.getReader();
				const decoder = new TextDecoder();
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					assistantText += decoder.decode(value, { stream: true });
					if (!assistantAdded) {
						assistantAdded = true;
						setMessages((previous) => [
							...previous,
							{
								id: assistantId,
								role: 'assistant',
								text: assistantText,
								createdAt: new Date().toISOString(),
							},
						]);
					} else {
						setMessages((previous) =>
							previous.map((message) =>
								message.id === assistantId
									? { ...message, text: assistantText }
									: message,
							),
						);
					}
				}
				assistantText += decoder.decode();
				if (!assistantText.trim()) throw new Error('Boş yanıt alındı.');
				await onCalculationUpdated?.();
			} catch (error) {
				if (controller.signal.aborted) return;
				toast.error('ISEEU asistanı yanıt veremedi', {
					description:
						error instanceof Error
							? error.message
							: 'Lütfen tekrar deneyin.',
				});
			} finally {
				if (abortController.current === controller) {
					abortController.current = null;
				}
				statusRef.current = 'ready';
				setStatus('ready');
			}
		},
		[calculationId, isSignedIn, onCalculationUpdated],
	);

	useEffect(() => {
		if (
			initialRequestStarted.current ||
			!calculationId ||
			initialMessages.length > 0
		) {
			return;
		}
		initialRequestStarted.current = true;
		void streamAssistant(undefined, 'start');
	}, [calculationId, initialMessages.length, streamAssistant]);

	const requestDocumentRecalculation = useCallback(() => {
		pendingDocumentRecalculation.current = true;
		if (statusRef.current !== 'ready') return;
		pendingDocumentRecalculation.current = false;
		void streamAssistant(undefined, 'documents_changed');
	}, [streamAssistant]);

	useEffect(() => {
		if (
			status !== 'ready' ||
			!pendingDocumentRecalculation.current
		) {
			return;
		}
		pendingDocumentRecalculation.current = false;
		void streamAssistant(undefined, 'documents_changed');
	}, [status, streamAssistant]);

	// Parameter tools persist while the model is still working. Poll the saved
	// calculation during a turn so newly confirmed rows appear in the overview
	// without waiting for the final assistant text.
	useEffect(() => {
		if (status === 'ready' || !onCalculationUpdated) return;
		const interval = setInterval(() => {
			void onCalculationUpdated();
		}, 1500);
		return () => clearInterval(interval);
	}, [onCalculationUpdated, status]);

	const handleSubmit = useCallback(
		(message: PromptInputMessage) => {
			const text = message.text?.trim();
			if (!text || status !== 'ready' || !calculationId) return;
			if (!isSignedIn) {
				setLoginPromptOpen(true);
				return;
			}

			const userMessage: AutomaticChatMessage = {
				id: nanoid(),
				role: 'user',
				text,
				createdAt: new Date().toISOString(),
			};
			setMessages((prev) => [...prev, userMessage]);
			setInput('');
			void streamAssistant(userMessage);
		},
		[calculationId, isSignedIn, status, streamAssistant],
	);

	const handleDocumentSelection = useCallback(
		async (event: ChangeEvent<HTMLInputElement>) => {
			if (!isSignedIn) {
				event.currentTarget.value = '';
				setLoginPromptOpen(true);
				return;
			}
			const selected = event.currentTarget.files
				? [...event.currentTarget.files]
				: [];
			event.currentTarget.value = '';

			const { accepted, errors } = validateDroppedFiles(
				selected,
				documents.length,
			);
			if (errors.length > 0) {
				toast.error('Bazı belgeler eklenemedi', {
					description: errors.join(' '),
				});
			}
			if (accepted.length === 0) return;

			setUploadingDocuments(true);
			const uploaded = await Promise.all(
				accepted.map(
					async (file): Promise<AutomaticDocumentRef | null> => {
						const toastId = toast.loading('Belge yükleniyor…', {
							description: file.name,
						});
						try {
							const id = await uploadDocument(
								file,
								() => {},
								() => {},
							);
							toast.success('Belge yüklendi', {
								id: toastId,
								description: file.name,
							});
							return {
								id,
								name: file.name,
								size: file.size,
								type: file.type,
							};
						} catch (error) {
							toast.error('Belge yüklenemedi', {
								id: toastId,
								description:
									error instanceof Error
										? error.message
										: 'Lütfen tekrar deneyin.',
							});
							return null;
						}
					},
				),
			);
			setUploadingDocuments(false);

			const uploadedDocuments = uploaded.filter(
				(document): document is AutomaticDocumentRef =>
					document !== null,
			);
			if (uploadedDocuments.length > 0) {
				const persisted = await onDocumentsUploaded(uploadedDocuments);
				if (persisted) requestDocumentRecalculation();
			}
		},
		[
			documents.length,
			onDocumentsUploaded,
			requestDocumentRecalculation,
			isSignedIn,
		],
	);

	const openLibraryPicker = useCallback(() => {
		if (!isSignedIn) {
			setLoginPromptOpen(true);
			return;
		}
		setPickerOpen(true);
		setLibrarySearch('');
		setPicked(new Set());
		setLibrary(null);
		void fetchDocuments().then(setLibrary);
	}, [isSignedIn]);

	const togglePicked = useCallback(
		(id: string) => {
			setPicked((previous) => {
				const next = new Set(previous);
				if (next.has(id)) {
					next.delete(id);
					return next;
				}
				if (documents.length + next.size >= MAX_DOCUMENT_COUNT) {
					toast.error('Belge sınırına ulaşıldı', {
						description: `En fazla ${MAX_DOCUMENT_COUNT} belge ekleyebilirsiniz.`,
					});
					return next;
				}
				next.add(id);
				return next;
			});
		},
		[documents.length],
	);

	const confirmLibrarySelection = useCallback(async () => {
		if (!library) return;
		const selected = library
			.filter(
				(document) =>
					picked.has(document.id) &&
					!selectedDocumentIds.has(document.id),
			)
			.map(({ id, name, size, type, url }) => ({
				id,
				name,
				size,
				type,
				url,
			}));
		if (selected.length === 0) return;

		const persisted = await onDocumentsUploaded(selected);
		if (!persisted) return;
		setPickerOpen(false);
			toast.success('Belgeler eklendi', {
			description: `${selected.length} belge bu hesaplamaya eklendi.`,
		});
		requestDocumentRecalculation();
	}, [
		library,
		onDocumentsUploaded,
		picked,
		requestDocumentRecalculation,
		selectedDocumentIds,
	]);

	const waiting = status === 'submitted';

	return (
		<div
			className={cn(
				'flex min-h-0 flex-col overflow-hidden pb-2',
				className,
			)}
		>
			<MessageScrollerProvider autoScroll defaultScrollPosition="end">
				<MessageScroller className="min-h-0 flex-1">
					<MessageScrollerViewport>
						<MessageScrollerContent className="py-8">
							{messages.map((message) => (
								<MessageScrollerItem
									key={message.id}
									messageId={message.id}
								>
									<Message
										align={
											message.role === 'user'
												? 'end'
												: 'start'
										}
									>
										<MessageContent
											className={cn(
												message.role === 'user' &&
													'w-fit rounded-lg bg-secondary px-4 py-3 text-foreground',
											)}
										>
											<MessageResponse>
												{message.text}
											</MessageResponse>
										</MessageContent>
									</Message>
								</MessageScrollerItem>
							))}
							{waiting && (
								<MessageScrollerItem>
									<Marker>
									<MarkerContent>
										<Shimmer className="text-sm">
											{messages.length === 0
												? 'Belgeler inceleniyor…'
												: 'Yanıt hazırlanıyor…'}
										</Shimmer>
										</MarkerContent>
									</Marker>
								</MessageScrollerItem>
							)}
						</MessageScrollerContent>
					</MessageScrollerViewport>
					<MessageScrollerButton />
				</MessageScroller>
			</MessageScrollerProvider>

			<div>
				<input
					accept={DOCUMENT_ACCEPT}
					className="hidden"
					disabled={uploadingDocuments}
					multiple
					onChange={handleDocumentSelection}
					ref={documentInputRef}
					type="file"
				/>
				<PromptInput onSubmit={handleSubmit}>
					<PromptInputBody>
						<PromptInputTextarea
							value={input}
							onChange={(event) =>
								setInput(event.currentTarget.value)
							}
							placeholder="Belgeleriniz hakkında bir şey sorun ya da bilgi ekleyin…"
						/>
					</PromptInputBody>
					<PromptInputFooter>
						<PromptInputTools>
							<DropdownMenu>
								<DropdownMenuTrigger
									render={
										<PromptInputButton
											aria-label="Belge ekle"
											disabled={uploadingDocuments}
										>
											<PaperclipIcon size={16} />
										</PromptInputButton>
									}
								></DropdownMenuTrigger>
								<DropdownMenuContent
									align="start"
									className="w-56"
								>
									<DropdownMenuItem
										onClick={() => {
											if (!isSignedIn) {
												setLoginPromptOpen(true);
												return;
											}
											documentInputRef.current?.click();
										}}
									>
										<UploadSimpleIcon /> Yeni belge yükle
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={openLibraryPicker}
									>
										<FolderOpenIcon /> Belgelerimden seç
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</PromptInputTools>
						<PromptInputSubmit
							status={status}
							disabled={status !== 'ready' || !calculationId}
						/>
					</PromptInputFooter>
				</PromptInput>

				<Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
					<DialogContent className="flex max-h-[calc(100dvh-3rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
						<DialogHeader className="border-b px-4 py-3">
							<DialogTitle>Belgelerimden seç</DialogTitle>
						</DialogHeader>
						<div className="border-b p-3">
							<div className="relative">
								<MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									className="h-9 pl-8"
									onChange={(event) =>
										setLibrarySearch(
											event.currentTarget.value,
										)
									}
									placeholder="Belgelerde ara"
									value={librarySearch}
								/>
							</div>
						</div>
						<div className="min-h-40 flex-1 overflow-y-auto p-2">
							{library === null ? (
								<div className="grid h-40 place-items-center">
									<span
										aria-label="Belgeler yükleniyor"
										className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent"
									/>
								</div>
							) : visibleLibrary.length === 0 ? (
								<p className="grid h-40 place-items-center px-4 text-center text-sm text-muted-foreground">
									{librarySearch
										? 'Aramanızla eşleşen belge yok.'
										: 'Seçilebilecek başka belge yok.'}
								</p>
							) : (
								<ul className="space-y-1">
									{visibleLibrary.map((document) => {
										const isPicked = picked.has(
											document.id,
										);
										const isPdf =
											document.type === 'application/pdf';
										return (
											<li key={document.id}>
												<button
													aria-pressed={isPicked}
													className={cn(
														'flex w-full items-center gap-3 rounded-lg border p-2 text-left transition-colors',
														isPicked
															? 'border-primary bg-primary/5'
															: 'border-transparent hover:bg-muted',
													)}
													onClick={() =>
														togglePicked(
															document.id,
														)
													}
													type="button"
												>
													<span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-md border bg-background text-primary">
														{!isPdf ? (
															<img
																alt=""
																className="size-full object-cover"
																src={
																	document.url
																}
															/>
														) : (
															<FilePdfIcon
																className="size-4.5"
																weight="duotone"
															/>
														)}
													</span>
													<span className="min-w-0 flex-1">
														<span className="block truncate text-sm font-medium">
															{document.name}
														</span>
														<span className="block text-xs text-muted-foreground">
															{formatBytes(
																document.size,
															)}
														</span>
													</span>
													<span
														className={cn(
															'grid size-5 shrink-0 place-items-center rounded-full border transition-colors',
															isPicked
																? 'border-primary bg-primary text-primary-foreground'
																: 'border-muted-foreground/40',
														)}
													>
														{isPicked && (
															<CheckIcon className="size-3" />
														)}
													</span>
												</button>
											</li>
										);
									})}
								</ul>
							)}
						</div>
						<div className="flex items-center justify-between gap-3 border-t p-3">
							<span className="text-xs text-muted-foreground">
								{picked.size} belge seçildi
							</span>
							<div className="flex items-center gap-2">
								<Button
									onClick={() => setPickerOpen(false)}
									type="button"
									variant="outline"
								>
									Vazgeç
								</Button>
								<Button
									disabled={picked.size === 0}
									onClick={confirmLibrarySelection}
									type="button"
								>
									Ekle
									{picked.size > 0 ? ` (${picked.size})` : ''}
								</Button>
							</div>
						</div>
					</DialogContent>
				</Dialog>

				<LoginPromptDialog
					open={loginPromptOpen}
					onOpenChange={setLoginPromptOpen}
					title="ISEEU asistanını kullanmak için giriş yapın"
					description="Yapay zeka ile sohbet etmek ve sohbete belge eklemek için giriş yapmanız gerekir."
				/>
			</div>
		</div>
	);
}
