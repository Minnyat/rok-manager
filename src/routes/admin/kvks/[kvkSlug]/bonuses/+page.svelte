<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatNumber, formatPower } from '$lib/utils';
	import { getContext } from 'svelte';
	import { goto } from '$app/navigation';
	import Spinner from '$lib/components/Spinner.svelte';
	const t: (key: string, params?: Record<string, string | number>) => string = getContext('t');

	interface Props {
		data: {
			kvk: any;
			bonuses: any[];
			activeVersion: any;
		};
		form: any;
	}
	let { data, form }: Props = $props();

	let showAdd = $state(false);
	let editingId = $state<number | null>(null);
	let searchQuery = $state('');
	let searchResults = $state<any[]>([]);
	let searching = $state(false);
	let selectedGovernor = $state<{ id: number; name: string } | null>(null);
	let adding = $state(false);
	let savingEdit = $state(false);
	let removingId = $state<number | null>(null);

	async function searchGovernor() {
		if (searchQuery.length < 2) { searchResults = []; return; }
		searching = true;
		try {
			const res = await fetch(`/api/search-governor?q=${encodeURIComponent(searchQuery)}`);
			searchResults = await res.json();
		} catch { searchResults = []; }
		searching = false;
	}

	function selectGovernor(gov: any) {
		selectedGovernor = { id: gov.governor_id, name: gov.governor_name };
		searchQuery = '';
		searchResults = [];
	}
</script>

<svelte:head>
	<title>Bonus - {data.kvk.name}</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<h1 class="text-xl font-bold">{t('kvkb.title')} — {data.kvk.name}</h1>
		<button class="btn-primary text-sm" onclick={() => { showAdd = !showAdd; selectedGovernor = null; searchQuery = ''; }}>
			{showAdd ? t('kvkb.close') : t('kvkb.addBtn')}
		</button>
	</div>

	{#if !data.activeVersion}
		<div class="card text-center py-6 text-rok-muted text-sm">
			{t('kvkb.noActive')}
		</div>
	{:else}
		{#if form?.error}
			<div class="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">
				{form.error}
			</div>
		{/if}
		{#if form?.bonusAdded || form?.bonusUpdated || form?.bonusRemoved}
			<div class="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-3 py-2">
				{t('kvkb.updated', { count: form.count })}
			</div>
		{/if}

		{#if showAdd}
			<div class="card">
				<h2 class="text-sm font-medium text-rok-muted mb-3">{t('kvkb.addTitle')}</h2>
				<form method="POST" action="?/add" use:enhance={() => {
					adding = true;
					return async ({ update }) => {
						adding = false;
						showAdd = false;
						selectedGovernor = null;
						await update();
					};
				}}>
					<div class="space-y-3">
						<!-- Governor search -->
						<div>
							<label class="text-sm text-rok-text block mb-1">{t('kvkb.governorLabel')}</label>
							{#if selectedGovernor}
								<div class="flex items-center gap-2 bg-rok-surface rounded-lg px-3 py-2">
									<span class="text-rok-accent font-medium">{selectedGovernor.name}</span>
									<span class="text-rok-dim text-xs">#{selectedGovernor.id}</span>
									<button type="button" class="text-rok-red text-xs ml-auto" onclick={() => { selectedGovernor = null; }}>✕</button>
								</div>
								<input type="hidden" name="governorId" value={selectedGovernor.id} />
							{:else}
								<div class="relative">
									<input
										type="text"
										bind:value={searchQuery}
										oninput={searchGovernor}
										placeholder={t('kvkb.searchPlaceholder')}
										class="input w-full pr-9"
									/>
									{#if searching}
										<div class="absolute right-3 top-1/2 -translate-y-1/2 text-rok-muted">
											<Spinner size={16} />
										</div>
									{/if}
								</div>
								{#if searchResults.length > 0}
									<div class="border border-rok-border rounded-lg mt-1 max-h-40 overflow-y-auto">
										{#each searchResults as gov}
											<button
												type="button"
												class="w-full text-left px-3 py-2 text-sm hover:bg-rok-surface transition-colors"
												onclick={() => selectGovernor(gov)}
											>
												<span class="text-rok-text">{gov.governor_name}</span>
												<span class="text-rok-dim text-xs ml-2">#{gov.governor_id}</span>
												<span class="text-rok-dim text-xs ml-2">Power: {formatPower(gov.power)}</span>
											</button>
										{/each}
									</div>
								{/if}
							{/if}
						</div>

						<div class="grid grid-cols-2 gap-3">
							<div>
								<label for="bonus-pct" class="text-sm text-rok-text block mb-1">{t('kvkb.bonusPctLabel')}</label>
								<input
									id="bonus-pct"
									name="bonusPct"
									type="number"
									step="5"
									min="-100"
									max="100"
									value="10"
									class="input w-full"
									required
								/>
							</div>
							<div>
								<label for="bonus-note" class="text-sm text-rok-text block mb-1">{t('c.note')}</label>
								<input
									id="bonus-note"
									name="note"
									type="text"
									placeholder={t('kvkb.notePlaceholder')}
									class="input w-full"
								/>
							</div>
						</div>

						<button type="submit" class="btn-primary inline-flex items-center gap-1.5" disabled={adding}>
							{#if adding}<Spinner size={16} />{/if}
							{t('kvkb.addSubmit')}
						</button>
					</div>
				</form>
			</div>
		{/if}

		<!-- Bonus list -->
		{#if data.bonuses.length === 0}
			<div class="card text-center py-8 text-rok-muted text-sm">
				{t('kvkb.empty')}
			</div>
		{:else}
			<div class="overflow-x-auto -mx-4 px-4">
				<table class="w-full text-sm">
					<thead class="sticky top-0 bg-rok-bg z-10">
						<tr class="border-b border-rok-border">
							<th class="py-2 px-2 text-left text-rok-muted">Governor</th>
							<th class="py-2 px-2 text-right text-rok-muted">Power</th>
							<th class="py-2 px-2 text-right text-rok-muted">DKP Base</th>
							<th class="py-2 px-2 text-right text-rok-muted">Bonus %</th>
							<th class="py-2 px-2 text-right text-rok-muted">Bonus Amount</th>
							<th class="py-2 px-2 text-right text-rok-muted">DKP Raw</th>
							<th class="py-2 px-2 text-left text-rok-muted">{t('c.note')}</th>
							<th class="py-2 px-2 text-right text-rok-muted">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each data.bonuses as b}
							{#if editingId === b.id}
								<!-- Edit mode -->
								<tr class="border-b border-rok-border/50 bg-rok-surface/30">
									<td class="py-2 px-2" colspan="8">
										<form method="POST" action="?/edit" use:enhance={() => {
											savingEdit = true;
											return async ({ update }) => {
												savingEdit = false;
												editingId = null;
												await update();
											};
										}} class="flex items-center gap-2 flex-wrap">
											<input type="hidden" name="id" value={b.id} />
											<span class="text-rok-accent font-medium min-w-[120px]">{b.governor_name}</span>
											<input type="number" name="bonusPct" value={b.bonus_pct} step="5" min="-100" max="100" class="input w-20 text-right" />
											<span class="text-rok-dim">%</span>
											<input type="text" name="note" value={b.note ?? ''} placeholder={t('c.note')} class="input flex-1 min-w-[120px]" />
											<button type="submit" class="btn-primary text-xs px-2 py-1 inline-flex items-center gap-1" disabled={savingEdit}>
												{#if savingEdit}<Spinner size={12} />{/if}
												{t('c.save')}
											</button>
											<button type="button" class="btn-ghost text-xs px-2 py-1" onclick={() => (editingId = null)} disabled={savingEdit}>{t('c.cancel')}</button>
										</form>
									</td>
								</tr>
							{:else}
								<tr class="border-b border-rok-border/50">
									<td class="py-2 px-2">
										<span class="text-rok-text font-medium">{b.governor_name}</span>
										<span class="text-rok-dim text-xs ml-1">#{b.governor_id}</span>
									</td>
									<td class="py-2 px-2 text-right">{formatPower(b.power)}</td>
									<td class="py-2 px-2 text-right">{formatNumber(Math.round(b.dkp_base))}</td>
									<td class="py-2 px-2 text-right">
										<span class="text-rok-accent font-medium">{b.bonus_pct > 0 ? '+' : ''}{b.bonus_pct}%</span>
									</td>
									<td class="py-2 px-2 text-right text-rok-accent">
										{b.bonus_amount > 0 ? '+' : ''}{formatNumber(Math.round(b.bonus_amount))}
									</td>
									<td class="py-2 px-2 text-right">{formatNumber(Math.round(b.dkp_raw))}</td>
									<td class="py-2 px-2 text-rok-dim text-xs">{b.note ?? '-'}</td>
									<td class="py-2 px-2 text-right">
										<div class="flex gap-1 justify-end">
											<button class="text-xs text-rok-accent hover:underline" onclick={() => (editingId = b.id)}>{t('c.edit')}</button>
											<form method="POST" action="?/remove" use:enhance={() => {
												removingId = b.id;
												return async ({ update }) => {
													await update();
													removingId = null;
												};
											}} class="inline">
												<input type="hidden" name="id" value={b.id} />
												<button type="submit" class="text-xs text-rok-red hover:underline inline-flex items-center gap-1" disabled={removingId === b.id}>
													{#if removingId === b.id}<Spinner size={12} />{/if}
													{t('c.remove')}
												</button>
											</form>
										</div>
									</td>
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{/if}
</div>
