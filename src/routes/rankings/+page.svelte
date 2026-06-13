<script lang="ts">
	import { getContext } from 'svelte';
	import { formatNumber, formatPower } from '$lib/utils';
	import { goto } from '$app/navigation';
	const t: (key: string, params?: Record<string, string | number>) => string = getContext('t');

	interface Props {
		data: {
			players: any[];
			versionName: string | null;
			sort: string;
			dir: string;
			view: string;
			page: number;
			totalPages: number;
			total: number;
		};
	}
	let { data }: Props = $props();

	const isCombined = $derived(data.view === 'combined');

	const columns = $derived([
		{ key: isCombined ? 'rank_combined' : 'rank_individual', label: '#', class: 'w-10' },
		{ key: 'governor_name', label: t('rank.name'), class: 'min-w-[120px]' },
		{ key: 'power', label: 'Power', class: 'text-right' },
		{ key: 't4', label: 'T4 Kill', class: 'text-right' },
		{ key: 't5', label: 'T5 Kill', class: 'text-right' },
		{ key: 'dead_t4', label: 'Dead T4', class: 'text-right' },
		{ key: 'dead_t5', label: 'Dead T5', class: 'text-right' },
		{ key: isCombined ? 'dkp_combined' : 'dkp_raw', label: t('rank.dkp'), class: 'text-right min-w-[120px]' },
	]);

	function buildUrl(params: Record<string, string | number>) {
		const current = { sort: data.sort, dir: data.dir, view: data.view, page: data.page };
		const merged = { ...current, ...params };
		return `/rankings?sort=${merged.sort}&dir=${merged.dir}&view=${merged.view}&page=${merged.page}`;
	}

	function sortBy(key: string) {
		const newDir = data.sort === key && data.dir === 'asc' ? 'desc' : 'asc';
		goto(buildUrl({ sort: key, dir: newDir, page: 1 }), { replaceState: true });
	}

	function switchView(view: string) {
		const defaultSort = view === 'combined' ? 'rank_combined' : 'rank_individual';
		goto(buildUrl({ sort: defaultSort, dir: 'asc', view, page: 1 }), { replaceState: true });
	}

	function goToPage(page: number) {
		if (page < 1 || page > data.totalPages) return;
		goto(buildUrl({ page }), { replaceState: true });
	}

	function sortIcon(key: string) {
		if (data.sort !== key) return '';
		return data.dir === 'asc' ? ' ↑' : ' ↓';
	}

	function getDkp(p: any) {
		return isCombined ? p.dkp_combined : p.dkp_raw;
	}

	function getRank(p: any) {
		return isCombined ? p.rank_combined : p.rank_individual;
	}

	const pageNumbers = $derived.by(() => {
		const pages: (number | '...')[] = [];
		const total = data.totalPages;
		const current = data.page;

		if (total <= 7) {
			for (let i = 1; i <= total; i++) pages.push(i);
		} else {
			pages.push(1);
			if (current > 3) pages.push('...');
			const start = Math.max(2, current - 1);
			const end = Math.min(total - 1, current + 1);
			for (let i = start; i <= end; i++) pages.push(i);
			if (current < total - 2) pages.push('...');
			pages.push(total);
		}
		return pages;
	});
</script>

<svelte:head>
	<title>{t('rank.title')} - ROK Manager</title>
</svelte:head>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h1 class="text-xl font-bold">{t('rank.title')}</h1>
		{#if data.versionName}
			<span class="badge-gold text-xs">{data.versionName}</span>
		{/if}
	</div>

	<!-- View Toggle -->
	<div class="flex gap-2">
		<button
			class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors {data.view === 'combined' ? 'bg-rok-accent text-rok-bg' : 'bg-rok-surface text-rok-muted hover:text-rok-text'}"
			onclick={() => switchView('combined')}
		>
			{t('rank.combined')}
		</button>
		<button
			class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors {data.view === 'individual' ? 'bg-rok-accent text-rok-bg' : 'bg-rok-surface text-rok-muted hover:text-rok-text'}"
			onclick={() => switchView('individual')}
		>
			{t('rank.individual')}
		</button>
	</div>

	{#if data.players.length === 0}
		<div class="card text-center py-8">
			<p class="text-rok-muted">{t('rank.noData')}</p>
		</div>
	{:else}
		<!-- Table with sticky header + horizontal scroll -->
		<div class="relative overflow-auto -mx-4 px-4 max-h-[calc(100vh-280px)] border border-rok-border/30 rounded-lg">
			<table class="w-full text-sm min-w-[700px]">
				<thead class="sticky top-0 z-10">
					<tr class="border-b border-rok-border bg-rok-bg">
						{#each columns as col}
							<th class="py-2.5 px-2 text-left text-rok-muted font-medium whitespace-nowrap {col.class}">
								<button class="hover:text-rok-accent transition-colors" onclick={() => sortBy(col.key)}>
									{col.label}{sortIcon(col.key)}
								</button>
							</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each data.players as p, i}
						<tr class="border-b border-rok-border/50 hover:bg-rok-surface/50">
							<td class="py-2 px-2 text-rok-dim">{getRank(p) ?? '-'}</td>
							<td class="py-2 px-2">
								<div class="flex items-center gap-1">
									<span class="font-medium truncate max-w-[150px]">{p.governor_name}</span>
									{#if p.bonus_pct > 0}
										<span class="text-[10px] text-rok-green font-medium">+{p.bonus_pct}%</span>
									{/if}
								</div>
								<div class="text-xs text-rok-dim">{p.governor_id}</div>
							</td>
							<td class="py-2 px-2 text-right text-rok-accent whitespace-nowrap">{formatPower(p.power)}</td>
							<td class="py-2 px-2 text-right whitespace-nowrap">{formatNumber(p.t4)}</td>
							<td class="py-2 px-2 text-right whitespace-nowrap">{formatNumber(p.t5)}</td>
							<td class="py-2 px-2 text-right text-rok-red whitespace-nowrap">{formatNumber(p.dead_t4)}</td>
							<td class="py-2 px-2 text-right text-rok-red whitespace-nowrap">{formatNumber(p.dead_t5)}</td>
							<td class="py-2 px-2 text-right whitespace-nowrap">
								{#if isCombined}
									<div class="font-semibold text-rok-accent">{p.dkp_combined != null ? formatNumber(Math.round(p.dkp_combined)) : '-'}</div>
									<div class="text-xs text-rok-dim">
										{p.dkp_raw != null ? formatNumber(Math.round(p.dkp_raw)) : '0'}
										{#if p.farm_contribution > 0}
											<span class="text-rok-green">+ {formatNumber(Math.round(p.farm_contribution))}</span>
										{/if}
									</div>
								{:else}
									<div class="font-semibold text-rok-accent">{p.dkp_raw != null ? formatNumber(Math.round(p.dkp_raw)) : '-'}</div>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Pagination -->
		<div class="flex items-center justify-between text-sm">
			<span class="text-rok-dim">
				{data.total} {t('rank.players')} · {t('rank.page')} {data.page}/{data.totalPages}
			</span>
			{#if data.totalPages > 1}
				<div class="flex items-center gap-1">
					<button
						class="px-2 py-1 rounded text-rok-muted hover:text-rok-text hover:bg-rok-surface disabled:opacity-30 disabled:pointer-events-none"
						disabled={data.page <= 1}
						onclick={() => goToPage(data.page - 1)}
					>
						‹
					</button>
					{#each pageNumbers as p}
						{#if p === '...'}
							<span class="px-1 text-rok-dim">…</span>
						{:else}
							<button
								class="w-8 h-8 rounded text-center transition-colors {p === data.page ? 'bg-rok-accent text-rok-bg font-semibold' : 'text-rok-muted hover:text-rok-text hover:bg-rok-surface'}"
								onclick={() => goToPage(p)}
							>
								{p}
							</button>
						{/if}
					{/each}
					<button
						class="px-2 py-1 rounded text-rok-muted hover:text-rok-text hover:bg-rok-surface disabled:opacity-30 disabled:pointer-events-none"
						disabled={data.page >= data.totalPages}
						onclick={() => goToPage(data.page + 1)}
					>
						›
					</button>
				</div>
			{/if}
		</div>
	{/if}
</div>
