<script lang="ts">
	import { enhance } from '$app/forms';
	import { getContext } from 'svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	const t: (key: string, params?: Record<string, string | number>) => string = getContext('t');

	let { data, form }: { data: any; form: any } = $props();
	let savingInfo = $state(false);
	let saving = $state(false);
</script>

<svelte:head><title>{t('kdcfg.title')}</title></svelte:head>

<div class="space-y-5 max-w-xl">
	<h1 class="text-xl font-bold">{t('kdcfg.title')}</h1>

	{#if !data.kingdom}
		<div class="card text-center py-8 text-rok-muted text-sm">{t('kdcfg.adminNote')}</div>
	{:else}
		{#if form?.error}
			<div class="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">{form.error}</div>
		{/if}
		{#if form?.infoSaved || form?.saved}
			<div class="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-3 py-2">{t('c.saved')}</div>
		{/if}

		<!-- Kingdom identity (King only) -->
		{#if data.isKing}
			<div class="card space-y-3">
				<h2 class="text-sm font-medium text-rok-muted">{t('c.kingdomSettings')}</h2>
				<form method="POST" action="?/updateInfo" use:enhance={() => { savingInfo = true; return async ({ update }) => { savingInfo = false; await update(); }; }}>
					<div class="flex flex-wrap gap-2 items-end">
						<div>
							<label class="block text-xs text-rok-dim mb-1" for="kdNumber">{t('mem.kingdomNumber')}</label>
							<input id="kdNumber" class="input w-28 opacity-60 cursor-not-allowed" value={data.kingdom.number} readonly disabled />
							<p class="text-xs text-rok-dim mt-1">{t('mem.kingdomNumberAdminOnly')}</p>
						</div>
						<div class="flex-1 min-w-[160px]">
							<label class="block text-xs text-rok-dim mb-1" for="kdName">{t('c.displayNameOpt')}</label>
							<input id="kdName" name="displayName" class="input w-full" value={data.kingdom.display_name ?? ''} placeholder={t('mem.displayNamePlaceholder', { number: data.kingdom.number })} autocomplete="off" />
						</div>
						<button type="submit" class="btn-primary inline-flex items-center gap-1.5" disabled={savingInfo}>
							{#if savingInfo}<Spinner size={16} />{/if}{t('c.save')}
						</button>
					</div>
				</form>
			</div>
		{:else}
			<div class="card space-y-1">
				<div class="text-sm">
					<span class="text-rok-dim">{t('kdcfg.kingdomLabel')}:</span>
					<span class="text-rok-text font-medium">KD {data.kingdom.number}</span>
					{#if data.kingdom.display_name}<span class="text-rok-muted">— {data.kingdom.display_name}</span>{/if}
				</div>
			</div>
		{/if}

		<!-- Coin carryover -->
		<div class="card space-y-3">
			<h2 class="text-sm font-medium text-rok-muted">{t('auction.coin.title')}</h2>
			<form method="POST" action="?/update" use:enhance={() => { saving = true; return async ({ update }) => { saving = false; await update(); }; }} class="flex items-end gap-3 flex-wrap">
				<label class="block">
					<span class="text-sm text-rok-text block mb-1">{t('kd2.coinKeepPct')}</span>
					<input name="coinKeepPct" type="number" min="0" max="100" step="1" value={data.kingdom.coin_keep_pct} class="input w-28" />
				</label>
				<button type="submit" class="btn-primary inline-flex items-center gap-1.5" disabled={saving}>
					{#if saving}<Spinner size={16} />{/if}{t('c.save')}
				</button>
			</form>
			<p class="text-xs text-rok-dim">{t('kd2.coinKeepHint')}</p>
		</div>
	{/if}
</div>
