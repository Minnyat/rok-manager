<script lang="ts">
	import { formatDate, formatNumber, formatPower } from '$lib/utils';
	import { getContext } from 'svelte';
	const t: (key: string, params?: Record<string, string | number>) => string = getContext('t');

	interface Props {
		data: { stats: any; groupedLinks: any[] };
	}
	let { data }: Props = $props();
	const s = data.stats;
</script>

<svelte:head>
	<title>Admin - ROK Manager</title>
</svelte:head>

<div class="space-y-4">
	<h1 class="text-xl font-bold">{t('ap.title')}</h1>

	<div class="grid grid-cols-2 md:grid-cols-3 gap-3">
		<div class="card text-center">
			<p class="text-2xl font-bold text-rok-accent">{s.activeUsers}</p>
			<p class="text-xs text-rok-muted">{t('ap.activeUsers')}</p>
		</div>
		<div class="card text-center">
			<p class="text-2xl font-bold text-rok-blue">{s.pendingInvites}</p>
			<p class="text-xs text-rok-muted">{t('ap.pendingInvites')}</p>
		</div>
		<div class="card text-center">
			<p class="text-2xl font-bold text-rok-red">{s.pendingReports}</p>
			<p class="text-xs text-rok-muted">{t('ap.pendingReports')}</p>
		</div>
		<div class="card text-center">
			<p class="text-2xl font-bold">{s.totalVersions}</p>
			<p class="text-xs text-rok-muted">{t('ap.dataVersions')}</p>
		</div>
		<div class="card text-center">
			<p class="text-2xl font-bold text-rok-green">{s.totalLinks}</p>
			<p class="text-xs text-rok-muted">{t('ap.accountLinks')}</p>
		</div>
		<div class="card text-center">
			<p class="text-sm font-semibold text-rok-accent truncate">
				{s.activeVersion?.name ?? t('ap.noVersion')}
			</p>
			<p class="text-xs text-rok-muted">{t('ap.versionActive')}</p>
			{#if s.activeVersion}
				<p class="text-xs text-rok-dim">{s.activeVersion.row_count} rows</p>
			{/if}
		</div>
	</div>

	<!-- Farm Account Links -->
	<div>
		<h2 class="text-sm font-medium text-rok-muted mb-3">{t('ap.farmLinks')} ({s.totalLinks})</h2>
		{#if data.groupedLinks.length > 0}
			<div class="space-y-3">
				{#each data.groupedLinks as group}
					<div class="card !p-0 overflow-hidden">
						<!-- User header -->
						<div class="flex items-center justify-between px-4 py-2.5 bg-rok-surface/50 border-b border-rok-border/50">
							<div class="flex items-center gap-2">
								<span class="font-semibold">{group.username}</span>
								<span class="text-rok-dim text-xs">·</span>
								<span class="text-sm">{group.mainName}</span>
								<span class="text-rok-dim text-xs">#{group.mainId}</span>
							</div>
							<div class="flex items-center gap-3 text-xs">
								<span class="text-rok-accent font-medium">{formatPower(group.mainPower)}</span>
								{#if group.farmContribution > 0}
									<span class="text-rok-green" title="DKP Combined">
										DKP {formatNumber(Math.round(group.dkpCombined))}
										<span class="text-rok-dim">(+{formatNumber(Math.round(group.farmContribution))} farm)</span>
									</span>
								{/if}
							</div>
						</div>
						<!-- Farm list -->
						<div class="divide-y divide-rok-border/30">
							{#each group.farms as farm}
								<div class="flex items-center justify-between px-4 py-2 text-sm">
									<div class="flex items-center gap-2">
										<span class="text-rok-dim text-xs">↳</span>
										<span class="text-rok-accent">{farm.name}</span>
										<span class="text-rok-dim text-xs">#{farm.id}</span>
									</div>
									<div class="flex items-center gap-3 text-xs text-rok-muted">
										<span>{formatPower(farm.power)}</span>
										<span>DKP {formatNumber(Math.round(farm.dkp))}</span>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="card text-center py-6 text-rok-dim text-sm">{t('ap.noLinks')}</div>
		{/if}
	</div>
</div>
