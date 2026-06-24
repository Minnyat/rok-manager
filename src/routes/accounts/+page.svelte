<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatPower } from '$lib/utils';
	import Modal from '$lib/components/Modal.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import { getContext } from 'svelte';
	import { appTitle } from '$lib/config';
	const t: (key: string, params?: Record<string, string | number>) => string = getContext('t');

	interface Props {
		data: { subAccounts: any[] };
		form: any;
	}
	let { data, form }: Props = $props();

	let reportOpen = $state(false);
	let reportGovernorId = $state(0);
	let reportGovernorName = $state('');
	let loading = $state(false);
	let reporting = $state(false);
	let removingId = $state<number | null>(null);

	let query = $state(form?.query ?? '');
	let suggestions = $state<any[]>([]);
	let showSuggestions = $state(false);
	let searching = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	async function onInput() {
		const q = query.trim();
		if (q.length < 2) {
			suggestions = [];
			showSuggestions = false;
			searching = false;
			return;
		}
		if (debounceTimer) clearTimeout(debounceTimer);
		searching = true;
		debounceTimer = setTimeout(async () => {
			try {
				const res = await fetch(`/api/players/search?q=${encodeURIComponent(q)}`);
				const data = await res.json() as { results?: any[] };
				suggestions = data.results || [];
				showSuggestions = suggestions.length > 0;
			} catch {
				suggestions = [];
				showSuggestions = false;
			} finally {
				searching = false;
			}
		}, 250);
	}

	function selectSuggestion(s: any) {
		query = String(s.governor_id);
		suggestions = [];
		showSuggestions = false;
	}

	$effect(() => {
		if (form?.canReport) {
			reportGovernorId = form.disputedGovernorId;
			reportGovernorName = form.disputedGovernorName;
			reportOpen = true;
		}
		if (form?.success) {
			query = '';
		}
	});
</script>

<svelte:head>
	<title>{appTitle(t('acc.title'))}</title>
</svelte:head>

<div class="space-y-6">
	<h1 class="text-xl font-bold">{t('acc.title')}</h1>

	<!-- Add sub-account -->
	<div class="card">
		<h2 class="text-sm font-medium text-rok-muted mb-3">{t('acc.addTitle')}</h2>

		{#if form?.error && !form?.canReport}
			<div class="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2 mb-3">
				{form.error}
			</div>
		{/if}
		{#if form?.success}
			<div class="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-3 py-2 mb-3">
				{t('acc.addedSuccess', { name: form.addedName })}
			</div>
		{/if}

		<form method="POST" action="?/add" use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				loading = false;
				await update();
			};
		}}>
			<div class="relative">
				<div class="flex gap-2">
					<div class="relative flex-1">
						<input
							name="query"
							type="text"
							class="input w-full pr-9"
							placeholder={t('acc.placeholder')}
							bind:value={query}
							oninput={onInput}
							onfocus={() => { if (suggestions.length > 0) showSuggestions = true; }}
						onblur={() => { setTimeout(() => (showSuggestions = false), 200); }}
							autocomplete="off"
							required
						/>
						{#if searching}
							<div class="absolute right-3 top-1/2 -translate-y-1/2 text-rok-muted">
								<Spinner size={16} />
							</div>
						{/if}
					</div>
					<button type="submit" class="btn-primary whitespace-nowrap inline-flex items-center gap-1.5" disabled={loading}>
						{#if loading}<Spinner size={16} />{/if}
						{t('acc.add')}
					</button>
				</div>

				{#if showSuggestions}
					<div
						class="absolute left-0 right-16 top-full mt-1 bg-rok-surface border border-rok-border rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto"
					>
						{#each suggestions as s}
							<button
								type="button"
								class="w-full text-left px-3 py-2 hover:bg-rok-accent/10 transition-colors flex items-center justify-between"
								onclick={() => selectSuggestion(s)}
							>
								<div>
									<span class="font-medium text-sm">{s.governor_name}</span>
									<span class="text-xs text-rok-dim ml-2">ID: {s.governor_id}</span>
								</div>
								<span class="text-xs text-rok-muted">{formatPower(s.power)}</span>
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</form>
	</div>

	<!-- Sub-account list -->
	{#if data.subAccounts.length > 0}
		<div class="space-y-3">
			{#each data.subAccounts as acc}
				<div class="card flex items-center justify-between">
					<div>
						<p class="font-medium">{acc.governor_name}</p>
						<p class="text-xs text-rok-dim">ID: {acc.governorId} • Power: {formatPower(acc.power || 0)}</p>
					</div>
					<form method="POST" action="?/remove" use:enhance={() => {
						removingId = acc.linkId;
						return async ({ update }) => {
							await update();
							removingId = null;
						};
					}}>
						<input type="hidden" name="linkId" value={acc.linkId} />
						<button type="submit" class="btn-ghost text-rok-red text-sm inline-flex items-center gap-1.5" disabled={removingId === acc.linkId}>
							{#if removingId === acc.linkId}<Spinner size={14} />{/if}
							{t('acc.remove')}
						</button>
					</form>
				</div>
			{/each}
		</div>
	{:else}
		<div class="card text-center py-6">
			<p class="text-rok-muted text-sm">{t('acc.noSubs')}</p>
			<p class="text-xs text-rok-dim mt-1">{t('acc.noSubsHint')}</p>
		</div>
	{/if}
</div>

<!-- Report modal -->
<Modal open={reportOpen} title={t('acc.reportTitle')} onclose={() => (reportOpen = false)}>
	<p class="text-sm text-rok-muted mb-3">
		{t('acc.reportDesc', { name: reportGovernorName })}
	</p>
	<form method="POST" action="?/report" use:enhance={() => {
		reporting = true;
		return async ({ update }) => {
			reporting = false;
			reportOpen = false;
			await update();
		};
	}}>
		<input type="hidden" name="governorId" value={reportGovernorId} />
		<textarea name="message" class="input mb-3" rows={3} placeholder={t('acc.reportPlaceholder')}></textarea>
		<div class="flex gap-2 justify-end">
			<button type="button" class="btn-secondary" onclick={() => (reportOpen = false)} disabled={reporting}>{t('acc.reportCancel')}</button>
			<button type="submit" class="btn-primary inline-flex items-center gap-1.5" disabled={reporting}>
				{#if reporting}<Spinner size={16} />{/if}
				{t('acc.reportSubmit')}
			</button>
		</div>
	</form>
	{#if form?.reported}
		<div class="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-3 py-2 mt-3">
			{t('acc.reportSent')}
		</div>
	{/if}
</Modal>
