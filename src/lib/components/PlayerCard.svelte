<script lang="ts">
	import { formatNumber, formatPower } from '$lib/utils';
	import { getContext } from 'svelte';
	const t: (key: string, params?: Record<string, string | number>) => string = getContext('t');

	interface Props {
		player: {
			governor_id: number;
			governor_name: string;
			ranking: number;
			power: number;
			kp: number;
			dead: number;
			kill_points: number;
			death_points: number;
			heal_points: number;
			t4: number;
			t5: number;
		};
		scores?: {
			dkp_raw: number;
			dkp_combined: number;
			rank_individual: number;
			rank_combined: number;
			farm_contribution: number;
		} | null;
		compact?: boolean;
	}

	let { player, scores = null, compact = false }: Props = $props();
</script>

<div class="card">
	<div class="flex items-start justify-between mb-3">
		<div>
			<div class="flex items-center gap-2">
				<span class="text-rok-muted text-sm">#{player.ranking}</span>
				<h3 class="font-semibold text-rok-text">{player.governor_name}</h3>
			</div>
			<p class="text-xs text-rok-dim mt-0.5">ID: {player.governor_id}</p>
		</div>
		<div class="text-right">
			<p class="text-rok-accent font-bold">{formatPower(player.power)}</p>
			<p class="text-xs text-rok-dim">Power</p>
		</div>
	</div>

	{#if !compact}
		<div class="grid grid-cols-3 gap-3 text-center">
			<div>
				<p class="text-sm font-semibold">{formatNumber(player.t4)}</p>
				<p class="text-xs text-rok-dim">T4 Kill</p>
			</div>
			<div>
				<p class="text-sm font-semibold">{formatNumber(player.t5)}</p>
				<p class="text-xs text-rok-dim">T5 Kill</p>
			</div>
			<div>
				<p class="text-sm font-semibold text-rok-red">{formatNumber(player.dead)}</p>
				<p class="text-xs text-rok-dim">Dead</p>
			</div>
		</div>
	{/if}

	{#if scores}
		<div class="mt-3 pt-3 border-t border-rok-border">
			<div class="flex items-center justify-between mb-2">
				<span class="text-xs text-rok-muted">DKP</span>
				<div class="flex items-center gap-2">
					{#if scores.rank_combined}
						<span class="text-xs px-1.5 py-0.5 rounded bg-rok-accent/20 text-rok-accent font-medium">
							#{scores.rank_combined}
						</span>
					{/if}
					<span class="font-bold text-rok-accent text-lg">{formatNumber(Math.round(scores.dkp_combined))}</span>
				</div>
			</div>

			<div class="space-y-1 text-sm">
				<div class="flex justify-between">
					<span class="text-rok-dim">{t('pc.dkpIndividual')}</span>
					<span>{formatNumber(Math.round(scores.dkp_raw))}</span>
				</div>
				{#if scores.farm_contribution > 0}
					<div class="flex justify-between">
						<span class="text-rok-dim">{t('pc.farmContrib')}</span>
						<span class="text-rok-green">+{formatNumber(Math.round(scores.farm_contribution))}</span>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
