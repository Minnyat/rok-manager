<script lang="ts">
	import { getContext } from 'svelte';
	import PlayerCard from '$lib/components/PlayerCard.svelte';
	import { formatNumber } from '$lib/utils';
	const t: (key: string, params?: Record<string, string | number>) => string = getContext('t');

	interface Props {
		data: {
			user: App.Locals['user'];
			player: any;
			scores: any;
			subAccounts: any[];
			versionName: string | null;
		};
	}
	let { data }: Props = $props();
</script>

<svelte:head>
	<title>{t('dash.title')} - ROK Manager</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<h1 class="text-xl font-bold">{t('dash.title')}</h1>
		{#if data.versionName}
			<span class="badge-gold text-xs">{data.versionName}</span>
		{/if}
	</div>

	{#if !data.player}
		<div class="card text-center py-8">
			<p class="text-rok-muted">{t('dash.noData')}</p>
			<p class="text-sm text-rok-dim mt-1">{t('dash.noDataHint')}</p>
		</div>
	{:else}
		<div>
			<h2 class="text-sm font-medium text-rok-muted mb-2">{t('dash.mainAccount')}</h2>
			<PlayerCard player={data.player} scores={data.scores} />
		</div>

		{#if data.subAccounts.length > 0}
			<div>
				<h2 class="text-sm font-medium text-rok-muted mb-2">
					{t('dash.subAccounts')} ({data.subAccounts.length})
				</h2>
				<div class="space-y-3">
					{#each data.subAccounts as sub}
						<PlayerCard player={sub} scores={sub.scores} compact />
					{/each}
				</div>
			</div>
		{/if}

		{#if data.player}
			<div class="card">
				<h3 class="text-sm font-medium text-rok-muted mb-3">{t('dash.details')}</h3>
				<div class="grid grid-cols-2 gap-3 text-sm">
					<div class="flex justify-between">
						<span class="text-rok-dim">KP</span>
						<span>{formatNumber(data.player.kp)}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-rok-dim">DKP (CSV)</span>
						<span>{formatNumber(data.player.dkp)}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-rok-dim">T4</span>
						<span>{formatNumber(data.player.t4)}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-rok-dim">T5</span>
						<span>{formatNumber(data.player.t5)}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-rok-dim">Dead</span>
						<span class="text-rok-red">{formatNumber(data.player.dead)}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-rok-dim">Healed</span>
						<span class="text-rok-green">{formatNumber(data.player.healed)}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-rok-dim">Kill Points</span>
						<span>{formatNumber(data.player.kill_points)}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-rok-dim">Death Points</span>
						<span>{formatNumber(data.player.death_points)}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-rok-dim">Heal Points</span>
						<span class="text-rok-green">{formatNumber(data.player.heal_points)}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-rok-dim">Feeding Rate</span>
						<span>{data.player.feeding_rate ? data.player.feeding_rate + '%' : '-'}</span>
					</div>
				</div>
			</div>
		{/if}
	{/if}
</div>
