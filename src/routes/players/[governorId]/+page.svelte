<script lang="ts">
	import { formatNumber, formatPower } from '$lib/utils';
	import { getContext } from 'svelte';
	import { appTitle } from '$lib/config';
	const t: (key: string, params?: Record<string, string | number>) => string = getContext('t');

	interface Props {
		data: {
			governorId: number;
			governorName: string | null;
			kvkHistory: any[];
			summary: any;
		};
	}
	let { data }: Props = $props();
</script>

<svelte:head>
	<title>{data.governorName ?? `Governor #${data.governorId}`} - Overview</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center gap-3">
		<div>
			<h1 class="text-xl font-bold">{data.governorName ?? `Governor #${data.governorId}`}</h1>
			<p class="text-sm text-rok-muted">ID: {data.governorId} · Tham gia {data.kvkHistory.length} KvK</p>
		</div>
	</div>

	<!-- Summary cards -->
	{#if data.summary}
		<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
			<div class="card text-center">
				<div class="text-xl font-bold text-rok-accent">{data.summary.participationCount}</div>
				<div class="text-xs text-rok-muted">KvK tham gia</div>
			</div>
			<div class="card text-center">
				<div class="text-xl font-bold text-rok-accent">{formatNumber(Math.round(data.summary.totalCombined))}</div>
				<div class="text-xs text-rok-muted">Total DKP Combined</div>
			</div>
			<div class="card text-center">
				<div class="text-xl font-bold text-rok-accent">
					{data.summary.bestRank ? `#${data.summary.bestRank}` : '-'}
				</div>
				<div class="text-xs text-rok-muted">Best Rank</div>
				{#if data.summary.bestKvk}
					<div class="text-[10px] text-rok-dim">({data.summary.bestKvk})</div>
				{/if}
			</div>
			<div class="card text-center">
				<div class="text-xl font-bold text-rok-accent">
					{data.summary.totalBonusAmount > 0 ? '+' + formatNumber(Math.round(data.summary.totalBonusAmount)) : '-'}
				</div>
				<div class="text-xs text-rok-muted">Total Bonus</div>
			</div>
		</div>
	{/if}

	<!-- KvK History -->
	{#if data.kvkHistory.length === 0}
		<div class="card text-center py-8 text-rok-muted text-sm">
			Không tìm thấy dữ liệu cho governor này trong bất kỳ KvK nào.
		</div>
	{:else}
		<div class="space-y-3">
			{#each data.kvkHistory as h}
				<div class="card">
					<div class="flex items-center justify-between mb-3">
						<div class="flex items-center gap-2">
							<h2 class="font-bold text-rok-text">{h.kvkName}</h2>
							{#if h.kvkStatus === 'active'}
								<span class="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Active</span>
							{:else if h.kvkStatus === 'archived'}
								<span class="text-xs px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400">Archived</span>
							{/if}
							{#if h.bonus}
								<span class="text-xs px-2 py-0.5 rounded-full bg-rok-accent/20 text-rok-accent">Bonus +{h.bonus.bonus_pct}%</span>
							{/if}
						</div>
						{#if h.versionName}
							<span class="text-xs text-rok-dim">{h.versionName}</span>
						{/if}
					</div>

					{#if h.player}
						<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
							<div>
								<span class="text-rok-dim text-xs">Power</span>
								<div class="font-medium text-rok-accent">{formatPower(h.player.power)}</div>
							</div>
							<div>
								<span class="text-rok-dim text-xs">T4 Kill</span>
								<div class="font-medium">{formatNumber(h.player.t4)}</div>
							</div>
							<div>
								<span class="text-rok-dim text-xs">T5 Kill</span>
								<div class="font-medium">{formatNumber(h.player.t5)}</div>
							</div>
							<div>
								<span class="text-rok-dim text-xs">Dead</span>
								<div class="font-medium text-rok-red">{formatNumber(h.player.dead_t4 + h.player.dead_t5)}</div>
							</div>
						</div>
					{/if}

					{#if h.scores}
						<div class="mt-3 pt-3 border-t border-rok-border/30 grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
							<div>
								<span class="text-rok-dim text-xs">DKP Base</span>
								<div class="font-medium">{formatNumber(Math.round(h.scores.dkp_base ?? h.scores.dkp_raw))}</div>
							</div>
							<div>
								<span class="text-rok-dim text-xs">Bonus</span>
								<div class="font-medium text-rok-accent">
									{#if h.scores.bonus_amount > 0}
										+{formatNumber(Math.round(h.scores.bonus_amount))}
									{:else}
										-
									{/if}
								</div>
							</div>
							<div>
								<span class="text-rok-dim text-xs">DKP Raw</span>
								<div class="font-medium">{formatNumber(Math.round(h.scores.dkp_raw))}</div>
							</div>
							<div>
								<span class="text-rok-dim text-xs">Farm</span>
								<div class="font-medium text-rok-green">
									{h.scores.farm_contribution > 0 ? '+' + formatNumber(Math.round(h.scores.farm_contribution)) : '-'}
								</div>
							</div>
							<div>
								<span class="text-rok-dim text-xs">DKP Total</span>
								<div class="font-bold text-rok-accent text-lg">{formatNumber(Math.round(h.scores.dkp_combined))}</div>
							</div>
						</div>
						<div class="mt-2 flex gap-4 text-xs text-rok-dim">
							<span>Rank Individual: <span class="text-rok-text">{h.scores.rank_individual ?? '-'}</span></span>
							<span>Rank Combined: <span class="text-rok-text">{h.scores.rank_combined ?? '-'}</span></span>
						</div>
					{/if}

					{#if h.farms.length > 0}
						<div class="mt-3 pt-3 border-t border-rok-border/30">
							<span class="text-xs text-rok-dim">Farm/Sub accounts:</span>
							<div class="flex flex-wrap gap-2 mt-1">
								{#each h.farms as farm}
									<a
										href="/players/{farm.governor_id}"
										class="text-xs px-2 py-1 bg-rok-surface rounded-md text-rok-muted hover:text-rok-accent transition-colors"
									>
										{farm.governor_name} <span class="text-rok-dim">#{farm.governor_id}</span>
									</a>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
