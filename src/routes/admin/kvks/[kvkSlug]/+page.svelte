<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatNumber } from '$lib/utils';
	import { getContext } from 'svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	const t: (key: string, params?: Record<string, string | number>) => string = getContext('t');

	interface Props {
		data: {
			kvk: any;
			stats: any;
			activeVersion: any;
			versions: any[];
			conversion: any;
			keepPct: number;
		};
		form: any;
	}
	let { data, form }: Props = $props();

	let confirmClose = $state(false);
	let busy = $state(false);

	function formatDate(ts: number | null) {
		if (!ts) return '-';
		return new Date(ts * 1000).toLocaleDateString('vi-VN', {
			day: '2-digit', month: '2-digit', year: 'numeric',
			hour: '2-digit', minute: '2-digit'
		});
	}
</script>

<svelte:head>
	<title>{data.kvk.name} - Admin</title>
</svelte:head>

<div class="space-y-6">
	{#if form?.error}
		<div class="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">{form.error}</div>
	{/if}
	{#if form?.closed}
		<div class="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-3 py-2">
			{t('kvko.closedMsg', { granted: formatNumber(form.granted), members: form.members, keep: form.keepPct })}
		</div>
	{/if}

	<!-- Stats cards -->
	<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
		<div class="card text-center">
			<div class="text-2xl font-bold text-rok-accent">{data.stats.versionCount}</div>
			<div class="text-xs text-rok-muted">{t('c.versions')}</div>
		</div>
		<div class="card text-center">
			<div class="text-2xl font-bold text-rok-accent">{formatNumber(data.stats.playerCount)}</div>
			<div class="text-xs text-rok-muted">{t('c.players')}</div>
		</div>
		<div class="card text-center">
			<div class="text-2xl font-bold text-rok-accent">{data.stats.bonusCount}</div>
			<div class="text-xs text-rok-muted">{t('kvko.bonusRecipients')}</div>
		</div>
		<div class="card text-center">
			{#if data.activeVersion}
				<div class="text-sm font-bold text-green-400 truncate">{data.activeVersion.name}</div>
				<div class="text-xs text-rok-muted">{t('kvko.activeVersion')}</div>
			{:else}
				<div class="text-sm text-rok-dim">-</div>
				<div class="text-xs text-rok-muted">{t('kvko.noActive')}</div>
			{/if}
		</div>
	</div>

	<!-- Quick actions -->
	<div class="card">
		<h2 class="text-sm font-medium text-rok-muted mb-3">{t('kvko.quickActions')}</h2>
		<div class="flex flex-wrap gap-2">
			<a href="/admin/kvks/{data.kvk.slug}/import" class="btn-secondary text-sm">
				{t('kvko.importCsv')}
			</a>
			<a href="/admin/kvks/{data.kvk.slug}/scores" class="btn-secondary text-sm">
				{t('kvko.scoresConfig')}
			</a>
			<a href="/admin/kvks/{data.kvk.slug}/bonuses" class="btn-secondary text-sm">
				{t('kvko.manageBonus')}
			</a>
			<a href="/admin/kvks/{data.kvk.slug}/versions" class="btn-secondary text-sm">
				{t('kvko.versionsBtn')}
			</a>
		</div>
	</div>

	<!-- Close KvK (irreversible; auto-finalizes coins) -->
	<div class="card {data.kvk.status === 'archived' ? '' : 'border border-amber-500/30'}">
		{#if data.kvk.status === 'archived'}
			<h2 class="text-sm font-medium text-rok-muted mb-1">🔒 {t('kvko.closedTitle')}</h2>
			<p class="text-sm text-rok-text">{t('kvko.closedDesc')}</p>
			{#if data.conversion}
				<p class="text-xs text-rok-dim mt-1">
					{t('kvko.convertedInfo', { date: formatDate(data.conversion.converted_at), keep: data.conversion.keep_pct })}
				</p>
			{/if}
		{:else}
			<h2 class="text-sm font-medium text-rok-muted mb-1">{t('kvko.closeTitle')}</h2>
			<p class="text-sm text-rok-dim mb-3">{t('kvko.closeDesc', { keep: data.keepPct })}</p>
			{#if !confirmClose}
				<button class="btn-ghost text-sm text-rok-red border border-rok-red/40" onclick={() => (confirmClose = true)}>
					{t('kvko.closeBtn')}
				</button>
			{:else}
				<div class="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 space-y-3">
					<p class="text-sm text-amber-300 font-medium">⚠️ {t('kvko.closeWarn')}</p>
					<form method="POST" action="?/closeKvk" use:enhance={() => { busy = true; return async ({ update }) => { busy = false; confirmClose = false; await update(); }; }} class="flex gap-2">
						<button type="submit" class="btn-primary text-sm inline-flex items-center gap-1.5" disabled={busy}>
							{#if busy}<Spinner size={16} />{/if}{t('kvko.closeConfirm')}
						</button>
						<button type="button" class="btn-ghost text-sm" onclick={() => (confirmClose = false)} disabled={busy}>{t('c.cancel')}</button>
					</form>
				</div>
			{/if}
		{/if}
	</div>

	<!-- Description -->
	{#if data.kvk.description}
		<div class="card">
			<h2 class="text-sm font-medium text-rok-muted mb-2">{t('kvko.description')}</h2>
			<p class="text-sm text-rok-text">{data.kvk.description}</p>
		</div>
	{/if}

	<!-- Versions list -->
	<div class="card">
		<div class="flex items-center justify-between mb-3">
			<h2 class="text-sm font-medium text-rok-muted">{t('c.versions')}</h2>
			<a href="/admin/kvks/{data.kvk.slug}/import" class="text-xs text-rok-accent hover:underline">{t('kvko.importNew')}</a>
		</div>

		{#if data.versions.length === 0}
			<p class="text-sm text-rok-dim text-center py-4">{t('kvko.noVersions')}</p>
		{:else}
			<div class="space-y-2">
				{#each data.versions as v}
					<div class="flex items-center justify-between text-sm py-2 border-b border-rok-border/30 last:border-0">
						<div>
							<span class="text-rok-text font-medium">{v.name}</span>
							<span class="text-rok-dim text-xs ml-2">({v.filename})</span>
							{#if data.activeVersion?.id === v.id}
								<span class="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 ml-2">{t('c.active')}</span>
							{/if}
						</div>
						<div class="text-xs text-rok-dim">
							{formatNumber(v.row_count)} rows · {formatDate(v.imported_at)}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
