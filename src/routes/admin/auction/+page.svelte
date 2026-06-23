<script lang="ts">
	import { enhance } from '$app/forms';
	import { getContext } from 'svelte';
	import { formatNumber } from '$lib/utils';
	import Spinner from '$lib/components/Spinner.svelte';
	const t: (key: string, params?: Record<string, string | number>) => string = getContext('t');

	let { data, form }: { data: any; form: any } = $props();

	let busy = $state(false);
	let adjustingId = $state<number | null>(null);
	let cancellingId = $state<number | null>(null);

	function downloadCsv(headers: string[], rows: (string | number)[][], filename: string) {
		const escape = (v: string | number) => {
			const s = String(v ?? '');
			return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
		};
		const csv = [headers, ...rows].map(r => r.map(escape).join(',')).join('\r\n');
		const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url; a.download = filename; a.click();
		URL.revokeObjectURL(url);
	}

	function exportLive() {
		if (!live || !data.reveal) return;
		const headers = ['Rank', 'Name', 'Governor ID', 'Unit Price', 'Sculptures', 'Will Pay'];
		const rows = (data.reveal.ranked ?? []).map((r: any, i: number) => {
			const res = data.reveal.results.find((x: any) => x.user_id === r.user_id);
			return [
				i + 1 <= live.max_rank ? i + 1 : '',
				r.display_name,
				r.governor_id,
				r.unit_price,
				res ? res.sculptures : 0,
				res ? res.total_cost : '',
			];
		});
		downloadCsv(headers, rows, `auction_${live.title.replace(/\s+/g, '_')}_live.csv`);
	}

	function exportResults() {
		if (!data.results?.length) return;
		const headers = ['Rank', 'Name', 'Governor ID', 'Sculptures', 'Paid', 'Status'];
		const rows = data.results.map((r: any) => [r.rank, r.display_name, r.governor_id, r.sculptures, r.total_cost, r.status]);
		downloadCsv(headers, rows, `auction_results.csv`);
	}

	const liveStatuses = ['draft', 'open', 'closed'];
	let live = $derived(data.auction && liveStatuses.includes(data.auction.status) ? data.auction : null);
	let canCreate = $derived(!data.auction || ['settled', 'cancelled'].includes(data.auction.status));

	function fmtUtc(epoch: number | null | undefined): string {
		if (!epoch) return '—';
		return new Date(epoch * 1000).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
	}
	const submit = () => { busy = true; return async ({ update }: any) => { busy = false; await update(); }; };
</script>

<svelte:head><title>{t('auction.title')}</title></svelte:head>

<div class="space-y-6">
	<h1 class="text-xl font-bold">{t('auction.title')}</h1>

	{#if !data.kingdomScoped}
		<div class="card text-center py-8 text-rok-muted text-sm">{t('auction.admin.kingdomOnly')}</div>
	{:else}
		{#if form?.error}
			<div class="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">{form.error}</div>
		{/if}
		{#if form?.auctionCreated || form?.closed || form?.settled || form?.resultCancelled || form?.resultAdjusted}
			<div class="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-3 py-2">{t('auction.msg.saved')}</div>
		{/if}

		<!-- 1. Create auction -->
		{#if canCreate}
			<div class="card space-y-3">
				<h2 class="text-sm font-medium text-rok-muted">{t('auction.create.title')}</h2>
				<form method="POST" action="?/create" use:enhance={submit} class="grid grid-cols-2 gap-3">
					<label class="col-span-2 block"><span class="text-sm text-rok-text block mb-1">{t('auction.create.name')}</span>
						<input name="title" type="text" class="input w-full" required /></label>
					<label class="block"><span class="text-sm text-rok-text block mb-1">{t('auction.create.opensAt')}</span>
						<input name="opensAt" type="datetime-local" class="input w-full" required /></label>
					<label class="block"><span class="text-sm text-rok-text block mb-1">{t('auction.create.closesAt')}</span>
						<input name="closesAt" type="datetime-local" class="input w-full" required /></label>
					<label class="block"><span class="text-sm text-rok-text block mb-1">{t('auction.create.increment')}</span>
						<input name="increment" type="number" min="1" step="1" value="1" class="input w-full" /></label>
					<label class="block"><span class="text-sm text-rok-text block mb-1">{t('auction.create.reserve')}</span>
						<input name="reserve" type="number" min="0" step="1" value="1" class="input w-full" /></label>
					<label class="block"><span class="text-sm text-rok-text block mb-1">{t('auction.create.softClose')}</span>
						<input name="softClose" type="number" min="0" step="1" value="5" class="input w-full" /></label>
					<div class="col-span-2">
						<p class="text-xs text-rok-dim mb-2">{t('auction.create.utcNote')}</p>
						<button type="submit" class="btn-primary inline-flex items-center gap-1.5" disabled={busy}>
							{#if busy}<Spinner size={16} />{/if}{t('auction.create.submit')}
						</button>
					</div>
				</form>
			</div>
		{/if}

		<!-- 3. Live auction monitor -->
		{#if live}
			<div class="card space-y-3">
				<div class="flex items-center justify-between flex-wrap gap-2">
					<h2 class="text-sm font-medium text-rok-muted">
						{live.title}
						<span class="ml-2 text-xs px-2 py-0.5 rounded bg-rok-surface text-rok-accent">{t('auction.status.' + live.status)}</span>
					</h2>
					<div class="flex items-center gap-3 flex-wrap">
						<div class="text-xs text-rok-dim">
							{t('auction.opensAt')}: {fmtUtc(live.opens_at)} · {t('auction.closesAt')}: {fmtUtc(live.closes_at)}
						</div>
						{#if (data.reveal?.ranked ?? []).length > 0}
							<button type="button" class="btn-ghost text-xs" onclick={exportLive}>{t('auction.export')}</button>
						{/if}
					</div>
				</div>

				{#if live.status === 'open'}
					<form method="POST" action="?/closeNow" use:enhance={submit} class="inline">
						<input type="hidden" name="auctionId" value={live.id} />
						<button type="submit" class="btn-ghost text-sm text-rok-red" disabled={busy}>{t('auction.closeNow')}</button>
					</form>
				{/if}
				{#if live.status === 'closed'}
					<form method="POST" action="?/settle" use:enhance={submit} class="inline">
						<input type="hidden" name="auctionId" value={live.id} />
						<button type="submit" class="btn-primary text-sm inline-flex items-center gap-1.5" disabled={busy}>
							{#if busy}<Spinner size={16} />{/if}{t('auction.settle')}
						</button>
					</form>
					<p class="text-xs text-rok-dim">{t('auction.settleHint')}</p>
				{/if}

				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b border-rok-border text-rok-muted">
								<th class="py-2 px-2 text-left">{t('auction.col.rank')}</th>
								<th class="py-2 px-2 text-left">{t('auction.col.player')}</th>
								<th class="py-2 px-2 text-right">{t('auction.col.unitPrice')}</th>
								<th class="py-2 px-2 text-right">{t('auction.col.sculptures')}</th>
								<th class="py-2 px-2 text-right">{t('auction.col.willPay')}</th>
							</tr>
						</thead>
						<tbody>
							{#each data.reveal?.ranked ?? [] as r, i}
								{@const res = data.reveal.results.find((x: any) => x.user_id === r.user_id)}
								<tr class="border-b border-rok-border/50">
									<td class="py-1.5 px-2">{i + 1 <= live.max_rank ? i + 1 : '—'}</td>
									<td class="py-1.5 px-2 text-rok-text">{r.display_name} <span class="text-rok-dim text-xs">#{r.governor_id}</span></td>
									<td class="py-1.5 px-2 text-right">{formatNumber(r.unit_price)}</td>
									<td class="py-1.5 px-2 text-right">{res ? res.sculptures : 0}</td>
									<td class="py-1.5 px-2 text-right text-rok-accent">{res ? formatNumber(res.total_cost) : '—'}</td>
								</tr>
							{/each}
							{#if (data.reveal?.ranked ?? []).length === 0}
								<tr><td colspan="5" class="py-4 text-center text-rok-dim">{t('auction.noBids')}</td></tr>
							{/if}
						</tbody>
					</table>
				</div>
			</div>
		{/if}

		<!-- 4. Settled results management -->
		{#if data.results?.length}
			<div class="card space-y-3">
				<div class="flex items-center justify-between gap-2">
					<h2 class="text-sm font-medium text-rok-muted">{t('auction.results.title')}</h2>
					<button type="button" class="btn-ghost text-xs" onclick={exportResults}>{t('auction.export')}</button>
				</div>
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b border-rok-border text-rok-muted">
								<th class="py-2 px-2 text-left">{t('auction.col.rank')}</th>
								<th class="py-2 px-2 text-left">{t('auction.col.player')}</th>
								<th class="py-2 px-2 text-right">{t('auction.col.sculptures')}</th>
								<th class="py-2 px-2 text-right">{t('auction.col.paid')}</th>
								<th class="py-2 px-2 text-left">{t('auction.col.status')}</th>
								<th class="py-2 px-2 text-right">{t('auction.col.actions')}</th>
							</tr>
						</thead>
						<tbody>
							{#each data.results as r}
								<tr class="border-b border-rok-border/50" class:opacity-50={r.status === 'cancelled'}>
									<td class="py-1.5 px-2">{r.rank}</td>
									<td class="py-1.5 px-2 text-rok-text">{r.display_name} <span class="text-rok-dim text-xs">#{r.governor_id}</span></td>
									<td class="py-1.5 px-2 text-right">{r.sculptures}</td>
									<td class="py-1.5 px-2 text-right text-rok-accent">{formatNumber(r.total_cost)}</td>
									<td class="py-1.5 px-2">{t('auction.rstatus.' + r.status)}</td>
									<td class="py-1.5 px-2 text-right">
										{#if r.status === 'active'}
											<div class="flex gap-2 justify-end">
												<button class="text-xs text-rok-accent hover:underline" onclick={() => (adjustingId = adjustingId === r.id ? null : r.id)}>{t('auction.adjust')}</button>
												<button class="text-xs text-rok-red hover:underline" onclick={() => (cancellingId = cancellingId === r.id ? null : r.id)}>{t('auction.cancel')}</button>
											</div>
										{/if}
									</td>
								</tr>
								{#if adjustingId === r.id}
									<tr class="bg-rok-surface/30"><td colspan="6" class="px-2 py-2">
										<form method="POST" action="?/adjustResult" use:enhance={submit} class="flex items-end gap-2 flex-wrap">
											<input type="hidden" name="resultId" value={r.id} />
											<label class="block"><span class="text-xs text-rok-dim block">{t('auction.newRank')}</span>
												<input name="newRank" type="number" min="1" max={live?.max_rank ?? 15} value={r.rank} class="input w-20" /></label>
											<label class="flex-1 min-w-[160px] block"><span class="text-xs text-rok-dim block">{t('auction.reason')}</span>
												<input name="reason" type="text" class="input w-full" required /></label>
											<button type="submit" class="btn-primary text-xs" disabled={busy}>{t('c.save')}</button>
										</form>
									</td></tr>
								{/if}
								{#if cancellingId === r.id}
									<tr class="bg-rok-surface/30"><td colspan="6" class="px-2 py-2">
										<form method="POST" action="?/cancelResult" use:enhance={submit} class="flex items-end gap-2 flex-wrap">
											<input type="hidden" name="resultId" value={r.id} />
											<label class="flex-1 min-w-[200px] block"><span class="text-xs text-rok-dim block">{t('auction.cancelReason')}</span>
												<input name="reason" type="text" class="input w-full" required /></label>
											<button type="submit" class="btn-ghost text-xs text-rok-red" disabled={busy}>{t('auction.confirmCancel')}</button>
										</form>
									</td></tr>
								{/if}
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}

		<!-- Wallets -->
		{#if data.wallets?.length}
			<details class="card">
				<summary class="cursor-pointer text-sm font-medium text-rok-muted">{t('auction.wallets.title')} ({data.wallets.length})</summary>
				<div class="overflow-x-auto mt-2">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b border-rok-border text-rok-muted">
								<th class="py-2 px-2 text-left">{t('auction.col.player')}</th>
								<th class="py-2 px-2 text-right">{t('auction.balance')}</th>
							</tr>
						</thead>
						<tbody>
							{#each data.wallets as w}
								<tr class="border-b border-rok-border/50">
									<td class="py-1.5 px-2 text-rok-text">{w.username} <span class="text-rok-dim text-xs">#{w.governor_id}</span></td>
									<td class="py-1.5 px-2 text-right text-rok-accent">{formatNumber(w.balance)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</details>
		{/if}

		<!-- 5. Audit log -->
		{#if data.audit?.length}
			<div class="card space-y-2">
				<h2 class="text-sm font-medium text-rok-muted">{t('auction.audit.title')}</h2>
				<ul class="text-xs text-rok-dim space-y-1">
					{#each data.audit as a}
						<li>
							<span class="text-rok-muted">{fmtUtc(a.created_at)}</span>
							· <span class="text-rok-text">{a.actor ?? '—'}</span>
							· {t('auction.action.' + a.action)}
							{#if a.target}→ {a.target}{/if}
							{#if a.reason}— "{a.reason}"{/if}
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	{/if}
</div>
