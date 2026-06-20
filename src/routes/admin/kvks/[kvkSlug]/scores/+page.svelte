<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatNumber } from '$lib/utils';
	import { getContext } from 'svelte';
	const t: (key: string, params?: Record<string, string | number>) => string = getContext('t');

	interface Props {
		data: {
			kvk: any;
			formulas: { id: string; name: string; description: string }[];
			currentFormulaId: string;
			currentFormula: any;
			configFields: {
				key: string;
				label: string;
				value: number | string;
				type: string;
				default: number | string;
				min?: number;
				max?: number;
				step?: number;
				description?: string;
			}[];
			scores: any[];
			activeVersion: any;
			otherKvks: any[];
		};
		form: any;
	}
	let { data, form }: Props = $props();
	let calculating = $state(false);
	let savingKey = $state('');
	let changingFormula = $state(false);
	let showCopy = $state(false);

	// Build formula preview string
	function getFormulaPreview(): string {
		const f = data.currentFormula;
		if (!f) return '';
		if (f.id === 'custom') {
			const expr = data.configFields.find(c => c.key === 'expression')?.value;
			return String(expr ?? '...');
		}
		// For built-in formulas, show the formula structure
		return f.description;
	}

	// Separate formula params from farm_contribution_pct
	const formulaParams = $derived(data.configFields.filter(f => f.key !== 'farm_contribution_pct'));
	const farmPctField = $derived(data.configFields.find(f => f.key === 'farm_contribution_pct'));
</script>

<svelte:head>
	<title>Scores & Formula — {data.kvk.name}</title>
</svelte:head>

<div class="space-y-6">
	<h1 class="text-xl font-bold">Scores & Formula — {data.kvk.name}</h1>

	<!-- Formula Selector -->
	<div class="card">
		<div class="flex items-center justify-between mb-3">
			<h2 class="text-sm font-medium text-rok-muted">Scoring Formula</h2>
			<div class="flex gap-2">
				{#if data.otherKvks.length > 0}
					<button class="text-xs text-rok-accent hover:underline" onclick={() => (showCopy = !showCopy)}>
						{showCopy ? '✕ Đóng' : '📋 Copy từ KvK khác'}
					</button>
				{/if}
			</div>
		</div>

		<form method="POST" action="?/changeFormula" use:enhance={() => {
			changingFormula = true;
			return async ({ update }) => {
				changingFormula = false;
				await update();
			};
		}}>
			<div class="flex items-center gap-3 mb-3">
				<label for="formulaType" class="text-sm text-rok-text">Formula:</label>
				<select
					id="formulaType"
					name="formulaType"
					class="input flex-1"
					disabled={changingFormula}
				>
					{#each data.formulas as f}
						<option value={f.id} selected={f.id === data.currentFormulaId}>
							{f.name}
						</option>
					{/each}
				</select>
				<button type="submit" class="btn-secondary text-xs" disabled={changingFormula}>
					{changingFormula ? '...' : 'Đổi formula'}
				</button>
			</div>
		</form>

		<!-- Formula description -->
		{#if data.currentFormula}
			<p class="text-xs text-rok-dim mb-2">
				{data.currentFormula.description}
			</p>
		{/if}

		<!-- Formula Preview -->
		<div class="bg-rok-surface rounded-lg p-3 mb-4 font-mono text-xs text-rok-accent">
			{getFormulaPreview()}
		</div>

		<!-- Copy from other KvK -->
		{#if showCopy && data.otherKvks.length > 0}
			<div class="bg-rok-surface rounded-lg p-3 mb-4">
				<form method="POST" action="?/copyFormula" use:enhance class="flex items-end gap-2">
					<div class="flex-1">
						<label for="fromKvkId" class="text-xs text-rok-muted block mb-1">Copy formula + config từ KvK:</label>
						<select name="fromKvkId" id="fromKvkId" class="input w-full">
							{#each data.otherKvks as kvk}
								<option value={kvk.id}>{kvk.name}</option>
							{/each}
						</select>
					</div>
					<button type="submit" class="btn-secondary text-xs">Copy</button>
				</form>
			</div>
		{/if}

		<!-- Status messages -->
		{#if form?.formulaChanged}
			<div class="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-3 py-2 mb-3">
				Đã đổi formula! Recalculate: {form.count} players.
			</div>
		{/if}
		{#if form?.formulaCopied}
			<div class="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-3 py-2 mb-3">
				Đã copy formula! Recalculate: {form.count} players.
			</div>
		{/if}
	</div>

	<!-- Formula Parameters -->
	<div class="card">
		<div class="flex items-center justify-between mb-3">
			<h2 class="text-sm font-medium text-rok-muted">Tham số Formula</h2>
			<form method="POST" action="?/resetDefaults" use:enhance class="inline">
				<button type="submit" class="text-xs text-rok-red hover:underline">↺ Reset mặc định</button>
			</form>
		</div>

		{#if form?.paramSaved || form?.configReset}
			<div class="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-3 py-2 mb-3">
				Đã lưu! Recalculate: {form.count} players.
			</div>
		{/if}

		<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
			{#each formulaParams as field}
				<form method="POST" action="?/saveParam" use:enhance={() => {
					savingKey = field.key;
					return async ({ update }) => {
						savingKey = '';
						await update();
					};
				}}>
					<input type="hidden" name="key" value={field.key} />
					<div class="flex items-center gap-2">
						<div class="flex-1 min-w-0">
							<label for="param_{field.key}" class="text-sm text-rok-text block truncate" title={field.description}>
								{field.label}
							</label>
						</div>
						{#if field.type === 'number'}
							<input
								id="param_{field.key}"
								type="number"
								name="value"
								value={field.value}
								step={field.step ?? 0.5}
								min={field.min ?? 0}
								max={field.max ?? 9999}
								class="input w-28 text-right"
							/>
						{:else}
							<input
								id="param_{field.key}"
								type="text"
								name="value"
								value={field.value}
								class="input w-48 text-right font-mono text-xs"
							/>
						{/if}
						<button type="submit" class="btn-secondary text-xs px-2 py-1" disabled={savingKey === field.key}>
							{savingKey === field.key ? '...' : 'Lưu'}
						</button>
					</div>
				</form>
			{/each}

			<!-- Farm Contribution Pct (standard param) -->
			{#if farmPctField}
				<form method="POST" action="?/saveParam" use:enhance={() => {
					savingKey = 'farm_contribution_pct';
					return async ({ update }) => {
						savingKey = '';
						await update();
					};
				}}>
					<input type="hidden" name="key" value="farm_contribution_pct" />
					<div class="flex items-center gap-2">
						<div class="flex-1 min-w-0">
							<label for="param_farm" class="text-sm text-rok-text block truncate" title="% điểm farm chuyển cho main">
								{farmPctField.label}
							</label>
						</div>
						<input
							id="param_farm"
							type="number"
							name="value"
							value={farmPctField.value}
							step={5}
							min={0}
							max={100}
							class="input w-28 text-right"
						/>
						<button type="submit" class="btn-secondary text-xs px-2 py-1" disabled={savingKey === 'farm_contribution_pct'}>
							{savingKey === 'farm_contribution_pct' ? '...' : 'Lưu'}
						</button>
					</div>
				</form>
			{/if}
		</div>
	</div>

	<!-- Scores Table -->
	{#if !data.activeVersion}
		<div class="card text-center py-6 text-rok-muted text-sm">
			KvK này chưa có active version. <a href="/admin/kvks/{data.kvk.slug}/versions" class="text-rok-accent underline">Activate version</a>
		</div>
	{:else}
		<div class="card">
			<div class="flex items-center justify-between mb-3">
				<p class="text-sm text-rok-muted">Version: <span class="text-rok-accent">{data.activeVersion.name}</span></p>
			</div>

			{#if form?.error}
				<div class="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2 mb-3">
					{form.error}
				</div>
			{/if}
			{#if form?.success}
				<div class="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-3 py-2 mb-3">
					Đã tính xong {form.count} players!
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
					{calculating ? 'Đang tính...' : data.scores.length > 0 ? '↻ Tính lại' : '⚡ Tính điểm'}
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
							<th class="py-2 px-2 text-right text-rok-muted">DKP Base</th>
							<th class="py-2 px-2 text-right text-rok-muted">Bonus</th>
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
								<td class="py-2 px-2 text-right">{formatNumber(Math.round(s.dkp_base ?? s.dkp_raw))}</td>
								<td class="py-2 px-2 text-right">
									{#if s.bonus_pct && s.bonus_pct !== 0}
										<span class="text-rok-accent">+{s.bonus_pct}%</span>
										<span class="text-rok-dim text-xs">({formatNumber(Math.round(s.bonus_amount ?? 0))})</span>
									{:else}
										<span class="text-rok-dim">-</span>
									{/if}
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
