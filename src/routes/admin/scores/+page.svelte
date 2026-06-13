<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatNumber } from '$lib/utils';
	import { getContext } from 'svelte';
	const t: (key: string, params?: Record<string, string | number>) => string = getContext('t');

	interface Props {
		data: {
			versionName: string | null;
			scores: any[];
			hasScores: boolean;
			configFields: { key: string; value: number; label: string }[];
		};
		form: any;
	}
	let { data, form }: Props = $props();
	let calculating = $state(false);
	let savingKey = $state('');
</script>

<svelte:head>
	<title>Scores - Admin</title>
</svelte:head>

<div class="space-y-6">
	<h1 class="text-xl font-bold">{t('as.title')}</h1>

	<!-- Config Editor -->
	<div class="card">
		<h2 class="text-sm font-medium text-rok-muted mb-3">{t('as.configTitle')}</h2>
		<p class="text-xs text-rok-dim mb-4">
			DKP = T4 Kill × <span class="text-rok-accent">{data.configFields.find(f => f.key === 't4_kill_weight')?.value ?? 1}</span>
			+ T5 Kill × <span class="text-rok-accent">{data.configFields.find(f => f.key === 't5_kill_weight')?.value ?? 3}</span>
			+ Dead T4 × <span class="text-rok-accent">{data.configFields.find(f => f.key === 'dead_t4_weight')?.value ?? 2}</span>
			+ Dead T5 × <span class="text-rok-accent">{data.configFields.find(f => f.key === 'dead_t5_weight')?.value ?? 4}</span>
			&nbsp;|&nbsp; {t('as.farmContrib')}: <span class="text-rok-accent">{data.configFields.find(f => f.key === 'farm_contribution_pct')?.value ?? 40}%</span>
		</p>

		{#if form?.configSaved}
			<div class="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-3 py-2 mb-3">
				{t('as.saved', { count: form.count })}
			</div>
		{/if}

		<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
			{#each data.configFields as field}
				<form method="POST" action="?/saveConfig" use:enhance={() => {
					savingKey = field.key;
					return async ({ update }) => {
						savingKey = '';
						await update();
					};
				}}>
					<input type="hidden" name="key" value={field.key} />
					<div class="flex items-center gap-2">
						<label for="config_{field.key}" class="text-sm text-rok-text flex-1">{field.label}</label>
						<input
							id="config_{field.key}"
							type="number"
							name="value"
							value={field.value}
							step={field.key === 'farm_contribution_pct' ? 5 : 0.5}
							min="0"
							max={field.key === 'farm_contribution_pct' ? 100 : 999}
							class="input w-24 text-right"
						/>
						<button type="submit" class="btn-secondary text-xs px-2 py-1" disabled={savingKey === field.key}>
							{savingKey === field.key ? '...' : t('as.save')}
						</button>
					</div>
				</form>
			{/each}
		</div>
	</div>

	{#if !data.versionName}
		<div class="card text-center py-6 text-rok-muted text-sm">
			{t('as.noVersion')} <a href="/admin/versions" class="text-rok-accent underline">{t('as.activateLink')}</a>
		</div>
	{:else}
		<div class="card">
			<div class="flex items-center justify-between mb-3">
				<p class="text-sm text-rok-muted">{t('as.version')}: <span class="text-rok-accent">{data.versionName}</span></p>
			</div>

			{#if form?.error}
				<div class="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2 mb-3">
					{form.error}
				</div>
			{/if}
			{#if form?.success}
				<div class="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-3 py-2 mb-3">
					{t('as.calculated', { count: form.count })}
				</div>
			{/if}

			<form method="POST" action="?/calculate" use:enhance={() => {
				calculating = true;
				return async ({ update }) => {
					calculating = false;
					await update();
				};
			}}>
				<button type="submit" class="btn-primary" disabled={calculating}>
					{calculating ? t('as.calculating') : data.hasScores ? t('as.recalculate') : t('as.calculate')}
				</button>
			</form>
		</div>

		{#if data.scores.length > 0}
			<div class="overflow-x-auto -mx-4 px-4 max-h-[calc(100vh-200px)] overflow-y-auto">
				<table class="w-full text-sm">
					<thead class="sticky top-0 bg-rok-bg z-10">
						<tr class="border-b border-rok-border">
							<th class="py-2 px-2 text-left text-rok-muted">#</th>
							<th class="py-2 px-2 text-left text-rok-muted">Tên</th>
							<th class="py-2 px-2 text-right text-rok-muted">DKP Raw</th>
							<th class="py-2 px-2 text-right text-rok-muted">Farm</th>
							<th class="py-2 px-2 text-right text-rok-muted">DKP Total</th>
							<th class="py-2 px-2 text-right text-rok-muted">Rank</th>
						</tr>
					</thead>
					<tbody>
						{#each data.scores as s, i}
							<tr class="border-b border-rok-border/50">
								<td class="py-2 px-2 text-rok-dim">{i + 1}</td>
								<td class="py-2 px-2">
									<span class="truncate max-w-[120px] block">{s.governor_name}</span>
								</td>
								<td class="py-2 px-2 text-right">{formatNumber(Math.round(s.dkp_raw))}</td>
								<td class="py-2 px-2 text-right text-rok-green">
									{s.farm_contribution > 0 ? '+' + formatNumber(Math.round(s.farm_contribution)) : '-'}
								</td>
								<td class="py-2 px-2 text-right font-bold text-rok-accent">{formatNumber(Math.round(s.dkp_combined))}</td>
								<td class="py-2 px-2 text-right text-rok-muted">{s.rank_combined}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{/if}
</div>
