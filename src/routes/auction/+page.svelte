<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { getContext, onMount } from 'svelte';
	import { formatNumber } from '$lib/utils';
	import Spinner from '$lib/components/Spinner.svelte';
	const t: (key: string, params?: Record<string, string | number>) => string = getContext('t');

	let { data, form }: { data: any; form: any } = $props();

	let busy = $state(false);
	let refreshing = $state(false);
	let lastUpdated = $state<number | null>(null);
	let nowSec = $state(Math.floor(Date.now() / 1000));

	// Reactive live view — starts from SSR data, updated by polling
	let liveView = $state(data.view);

	// Sync from server when load re-runs (form submit / invalidateAll)
	$effect(() => {
		liveView = data.view;
	});

	let auction = $derived(liveView?.auction ?? null);
	let viewer = $derived(liveView?.viewer ?? null);
	let isOpen = $derived(auction?.status === 'open');
	let minBid = $derived(
		viewer?.currentBid != null ? viewer.currentBid + (auction?.increment ?? 1) : auction?.reserve ?? 1
	);
	let outbid = $derived(viewer?.currentBid != null && !viewer.isWinning);

	function fmtUtc(epoch: number | null | undefined): string {
		if (!epoch) return '—';
		return new Date(epoch * 1000).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
	}
	function countdown(target: number): string {
		let s = Math.max(0, target - nowSec);
		const d = Math.floor(s / 86400); s -= d * 86400;
		const h = Math.floor(s / 3600); s -= h * 3600;
		const m = Math.floor(s / 60); s -= m * 60;
		return (d ? d + 'd ' : '') + `${h}h ${m}m ${s}s`;
	}
	function fmtTime(epoch: number): string {
		return new Date(epoch * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
	}

	async function fetchLive() {
		refreshing = true;
		try {
			const res = await fetch('/api/auction/live');
			if (!res.ok) return;
			const payload = await res.json() as { ok: boolean; view?: any; serverNow?: number };
			if (!payload.ok) return;
			const prevStatus = liveView?.auction?.status;
			liveView = payload.view;
			lastUpdated = payload.serverNow ?? null;
			// Auction just transitioned out of open — reload to get reveal data
			if (prevStatus === 'open' && payload.view?.auction?.status !== 'open') {
				await invalidateAll();
			}
		} finally {
			refreshing = false;
		}
	}

	const submit = () => { busy = true; return async ({ update }: any) => { busy = false; await update(); }; };

	onMount(() => {
		const clockId = setInterval(() => (nowSec = Math.floor(Date.now() / 1000)), 1000);

		let timeoutId: ReturnType<typeof setTimeout> | null = null;

		function scheduleNext() {
			if (timeoutId) clearTimeout(timeoutId);
			const a = liveView?.auction;
			if (!a || a.status !== 'open') return;
			const secsToClose = Math.max(0, a.closes_at - Math.floor(Date.now() / 1000));
			const softWindow = (a.soft_close_minutes ?? 5) * 60;
			// Soft-close window → poll every 10s; otherwise every 30s
			const delay = secsToClose <= softWindow ? 10_000 : 30_000;
			timeoutId = setTimeout(async () => {
				await fetchLive();
				scheduleNext();
			}, delay);
		}

		scheduleNext();

		return () => {
			clearInterval(clockId);
			if (timeoutId) clearTimeout(timeoutId);
		};
	});
</script>

<svelte:head><title>{auction?.title ?? t('auction.title')}</title></svelte:head>

<div class="max-w-3xl mx-auto space-y-5">
	<h1 class="text-xl font-bold">{auction?.title ?? t('auction.title')}</h1>

	<!-- Rules (collapsible, follows current language) — always visible, even when
	     there is no active auction so players can read the rules anytime. -->
	<details class="card text-sm text-rok-text">
		<summary class="cursor-pointer text-rok-accent">{t('auction.rules.title')}</summary>
		<div class="mt-2 whitespace-pre-line text-rok-dim text-xs leading-relaxed">{t('auction.rules.body')}</div>
	</details>

	{#if !liveView}
		<div class="card text-center py-8 text-rok-muted text-sm">{t('auction.none')}</div>
	{:else}
		<!-- Wallet + status -->
		<div class="card flex items-center justify-between flex-wrap gap-3">
			<div>
				<div class="text-xs text-rok-dim">{t('auction.balance')}</div>
				<div class="text-lg font-bold text-rok-accent">{formatNumber(viewer?.balance ?? 0)} <span class="text-xs text-rok-dim">{t('auction.coins')}</span></div>
				<div class="text-xs text-rok-dim">{t('auction.available')}: {formatNumber(viewer?.available ?? 0)}</div>
			</div>
			<div class="text-right">
				<div class="text-xs px-2 py-0.5 rounded bg-rok-surface text-rok-accent inline-block">{t('auction.status.' + auction.status)}</div>
				<div class="text-xs text-rok-dim mt-1">{t('auction.closesAt')}: {fmtUtc(auction.closes_at)}</div>
				{#if isOpen}<div class="text-sm font-mono text-rok-text">{countdown(auction.closes_at)}</div>{/if}
				{#if isOpen}
					<div class="flex items-center justify-end gap-2 mt-1">
						{#if lastUpdated}
							<span class="text-xs text-rok-dim">{t('auction.liveUpdated', { time: fmtTime(lastUpdated) })}</span>
						{/if}
						<button
							onclick={() => fetchLive()}
							disabled={refreshing}
							class="text-xs text-rok-accent hover:underline inline-flex items-center gap-1 disabled:opacity-50"
						>
							{#if refreshing}<Spinner size={10} />{/if}{t('auction.refresh')}
						</button>
					</div>
				{/if}
			</div>
		</div>

		{#if form?.error}
			<div class="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">{form.error}</div>
		{/if}
		{#if form?.bidPlaced}
			<div class="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-3 py-2">
				{form.newRank ? t('auction.msg.bidRank', { rank: form.newRank, cost: formatNumber(form.cost) }) : t('auction.msg.bidNoSlot')}
				{#if form.extended}· {t('auction.msg.extended')}{/if}
			</div>
		{/if}
		{#if outbid}
			<div class="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm rounded-lg px-3 py-2">{t('auction.outbid')}</div>
		{/if}

		<!-- Bid form -->
		{#if isOpen}
			<div class="card space-y-2">
				<h2 class="text-sm font-medium text-rok-muted">{t('auction.bid.title')}</h2>
				<p class="text-xs text-rok-dim">
					{t('auction.bid.hint', { min: formatNumber(minBid) })}
					{#if viewer?.currentBid != null}· {t('auction.yourBid')}: {formatNumber(viewer.currentBid)}{/if}
				</p>
				<form method="POST" action="?/bid" use:enhance={submit} class="flex items-end gap-2">
					<div>
						<label for="unitPrice" class="text-sm text-rok-text block mb-1">{t('auction.bid.unitPrice')}</label>
						<input id="unitPrice" name="unitPrice" type="number" min={minBid} step={auction.increment} value={minBid} class="input w-36" required />
					</div>
					<button type="submit" class="btn-primary inline-flex items-center gap-1.5" disabled={busy}>
						{#if busy}<Spinner size={16} />{/if}{t('auction.bid.submit')}
					</button>
				</form>
				<p class="text-xs text-rok-dim">{t('auction.bid.raiseOnly')}</p>
			</div>
		{/if}

		<!-- Ladder (anonymized while live) -->
		{#if !data.reveal}
			<div class="card">
				<h2 class="text-sm font-medium text-rok-muted mb-2">{t('auction.ladder.title')}</h2>
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b border-rok-border text-rok-muted">
								<th class="py-2 px-2 text-left">{t('auction.col.rank')}</th>
								<th class="py-2 px-2 text-right">{t('auction.col.sculptures')}</th>
								<th class="py-2 px-2 text-right">{t('auction.col.currentPrice')}</th>
								<th class="py-2 px-2 text-right">{t('auction.col.minToClaim')}</th>
							</tr>
						</thead>
						<tbody>
							{#each liveView.ladder as row}
								<tr class="border-b border-rok-border/50" class:bg-rok-surface={viewer?.provRank === row.rank}>
									<td class="py-1.5 px-2">
										{row.rank}
										{#if viewer?.provRank === row.rank}<span class="text-rok-accent text-xs ml-1">({t('auction.you')})</span>{/if}
									</td>
									<td class="py-1.5 px-2 text-right">{row.sculptures}</td>
									<td class="py-1.5 px-2 text-right">{row.currentPrice != null ? formatNumber(row.currentPrice) : '—'}</td>
									<td class="py-1.5 px-2 text-right text-rok-dim">{formatNumber(row.minToClaim)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}

		<!-- Reveal (after close) -->
		{#if data.reveal}
			<div class="card">
				<h2 class="text-sm font-medium text-rok-muted mb-2">{t('auction.reveal.title')}</h2>
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b border-rok-border text-rok-muted">
								<th class="py-2 px-2 text-left">{t('auction.col.rank')}</th>
								<th class="py-2 px-2 text-left">{t('auction.col.player')}</th>
								<th class="py-2 px-2 text-right">{t('auction.col.bid')}</th>
								<th class="py-2 px-2 text-right">{t('auction.col.sculptures')}</th>
								<th class="py-2 px-2 text-right">{t('auction.col.paid')}</th>
							</tr>
						</thead>
						<tbody>
							{#each data.reveal.ranked as r, i}
								{@const res = data.reveal.results.find((x: any) => x.user_id === r.user_id)}
								<tr class="border-b border-rok-border/50">
									<td class="py-1.5 px-2">{res ? res.rank : '—'}</td>
									<td class="py-1.5 px-2 text-rok-text">{r.display_name} <span class="text-rok-dim text-xs">#{r.governor_id}</span></td>
									<td class="py-1.5 px-2 text-right">{formatNumber(r.unit_price)}</td>
									<td class="py-1.5 px-2 text-right">{res ? res.sculptures : 0}</td>
									<td class="py-1.5 px-2 text-right text-rok-accent">{res ? formatNumber(res.total_cost) : '—'}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	{/if}
</div>
