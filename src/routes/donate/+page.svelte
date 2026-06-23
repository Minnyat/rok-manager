<script lang="ts">
	import { getContext } from 'svelte';
	import { appTitle } from '$lib/config';
	import type { DonateMethod } from '$lib/server/donate';

	const t: (key: string, params?: Record<string, string | number>) => string = getContext('t');

	let { data }: { data: { methods: DonateMethod[] } } = $props();

	let copiedId = $state<number | null>(null);
	let zoomedSrc = $state<string | null>(null);
	let zoomedName = $state('');

	async function copyText(text: string, id: number) {
		try {
			if (navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(text);
			} else {
				// Fallback for insecure (non-HTTPS) contexts where the Clipboard API is missing
				const ta = document.createElement('textarea');
				ta.value = text;
				ta.style.position = 'fixed';
				ta.style.opacity = '0';
				document.body.appendChild(ta);
				ta.select();
				document.execCommand('copy');
				document.body.removeChild(ta);
			}
			copiedId = id;
			setTimeout(() => { copiedId = null; }, 2000);
		} catch {
			// Copy failed (permission denied / unsupported) — fail silently
		}
	}

	function openZoom(m: DonateMethod) {
		zoomedSrc = m.qr_data;
		zoomedName = m.name;
	}

	function closeZoom() { zoomedSrc = null; }

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') closeZoom();
	}

	const typeBadge: Record<string, string> = {
		bank:    'border-rok-blue/40   text-rok-blue   bg-rok-blue/5',
		ewallet: 'border-rok-green/40  text-rok-green  bg-rok-green/5',
		paypal:  'border-blue-400/40   text-blue-400   bg-blue-400/5',
		crypto:  'border-purple-400/40 text-purple-400 bg-purple-400/5',
		other:   'border-rok-border    text-rok-muted',
	};

	// Crypto / long address: truncate middle for display
	function truncateAddr(addr: string) {
		if (addr.length <= 24) return addr;
		return addr.slice(0, 10) + '…' + addr.slice(-8);
	}

	function isCryptoAddress(str: string) {
		return !str.startsWith('http');
	}
</script>

<svelte:head><title>{appTitle(t('don.title'))}</title></svelte:head>
<svelte:window onkeydown={handleKeydown} />

<div class="max-w-2xl mx-auto space-y-6 py-4">
	<div class="text-center space-y-2">
		<h1 class="text-2xl font-bold text-rok-accent">☕ {t('don.title')}</h1>
		<p class="text-sm text-rok-muted max-w-md mx-auto">{t('don.subtitle')}</p>
	</div>

	{#if data.methods.length === 0}
		<div class="card text-center py-12 text-rok-dim text-sm">{t('don.noMethods')}</div>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2">
			{#each data.methods as m (m.id)}
				<div class="card space-y-4">
					<!-- Header: name + type badge -->
					<div class="flex items-start justify-between gap-2">
						<div>
							<h2 class="font-bold text-base leading-tight">{m.name}</h2>
							{#if m.bank_name}
								<p class="text-sm text-rok-muted mt-0.5">{m.bank_name}</p>
							{/if}
						</div>
						<span class="text-xs px-2 py-0.5 rounded-full border shrink-0 {typeBadge[m.type] ?? typeBadge.other}">
							{t(`don.type.${m.type}`)}
						</span>
					</div>

					<!-- Account info (bank / ewallet) -->
					{#if m.account_number || m.account_name}
						<div class="bg-rok-surface/50 border border-rok-border/50 rounded-lg px-3 py-2.5 space-y-1">
							{#if m.account_name}
								<div class="flex items-center justify-between text-xs">
									<span class="text-rok-dim">{t('don.accountName')}</span>
									<span class="font-medium uppercase tracking-wide">{m.account_name}</span>
								</div>
							{/if}
							{#if m.account_number}
								<div class="flex items-center justify-between gap-2">
									<span class="text-xs text-rok-dim">{t('don.accountNumber')}</span>
									<div class="flex items-center gap-2">
										<span class="font-mono font-semibold text-rok-accent text-sm">{m.account_number}</span>
										<button
											class="text-xs text-rok-muted hover:text-rok-accent transition-colors"
											onclick={() => copyText(m.account_number!, m.id)}
										>
											{copiedId === m.id ? t('don.copied') : t('don.copyNumber')}
										</button>
									</div>
								</div>
							{/if}
						</div>
					{/if}

					<!-- Payment link (PayPal / crypto) -->
					{#if m.payment_link}
						{#if isCryptoAddress(m.payment_link)}
							<!-- Crypto address: copy button -->
							<div class="bg-rok-surface/50 border border-rok-border/50 rounded-lg px-3 py-2.5">
								<div class="flex items-center justify-between gap-2 text-xs">
									<span class="text-rok-dim shrink-0">{m.bank_name ?? 'Address'}</span>
									<div class="flex items-center gap-2 min-w-0">
										<span class="font-mono text-purple-300 truncate text-xs" title={m.payment_link}>
											{truncateAddr(m.payment_link)}
										</span>
										<button
											class="text-rok-muted hover:text-rok-accent transition-colors shrink-0"
											onclick={() => copyText(m.payment_link!, m.id)}
										>
											{copiedId === m.id ? t('don.copied') : t('don.copyAddress')}
										</button>
									</div>
								</div>
							</div>
						{:else}
							<!-- URL (PayPal, etc.): button link -->
							<a
								href={m.payment_link}
								target="_blank"
								rel="noopener noreferrer"
								class="flex items-center justify-center gap-2 w-full rounded-lg border border-rok-border bg-rok-surface/50 hover:border-rok-accent/50 hover:bg-rok-surface transition-colors px-4 py-2.5 text-sm font-medium"
							>
								{#if m.type === 'paypal'}
									<svg class="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
										<path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.59 3.025-2.566 5.152-6.594 5.152H11.94c-.524 0-.968.382-1.05.9l-1.37 8.668H14.3c.46 0 .85-.334.922-.789l.038-.199.731-4.627.047-.254a.932.932 0 0 1 .921-.79h.58c3.755 0 6.695-1.526 7.552-5.94.36-1.847.174-3.389-.869-4.834z"/>
									</svg>
								{/if}
								<span>{t('don.payVia', { name: m.name })}</span>
								<svg class="w-3.5 h-3.5 text-rok-dim" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
								</svg>
							</a>
						{/if}
					{/if}

					<!-- Description -->
					{#if m.description}
						<p class="text-xs text-rok-dim">{m.description}</p>
					{/if}

					<!-- QR Code -->
					{#if m.qr_data}
						<div class="space-y-1.5">
							<p class="text-xs text-rok-dim text-center">{t('don.scanQr')}</p>
							<div class="flex justify-center">
								<button
									onclick={() => openZoom(m)}
									class="group relative border border-rok-border rounded-xl overflow-hidden bg-white p-2 w-48 h-48 cursor-zoom-in hover:border-rok-accent/50 transition-colors"
									aria-label="Phóng to QR {m.name}"
								>
									<img src={m.qr_data} alt="QR {m.name}" class="w-full h-full object-contain" />
									<div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-end justify-end p-1.5">
										<span class="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
											🔍 Phóng to
										</span>
									</div>
								</button>
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Lightbox -->
{#if zoomedSrc}
	<!-- Backdrop click closes; Esc handled at window level (keyboard equivalent) -->
	<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
	<div
		class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
		onclick={closeZoom}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_click_events_have_key_events -->
		<div
			class="relative bg-white rounded-2xl p-4 max-w-sm w-full shadow-2xl"
			onclick={(e) => e.stopPropagation()}
			role="img"
			aria-label="QR {zoomedName}"
		>
			<button
				onclick={closeZoom}
				class="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-rok-surface border border-rok-border flex items-center justify-center text-rok-muted hover:text-rok-text transition-colors shadow-lg"
				aria-label="Đóng"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
			<img src={zoomedSrc} alt="QR {zoomedName}" class="w-full h-auto" />
			<p class="text-center text-sm font-medium text-gray-700 mt-3">{zoomedName}</p>
		</div>
		<p class="absolute bottom-6 text-xs text-white/40">{t('don.tapToClose')}</p>
	</div>
{/if}
