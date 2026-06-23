<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatNumber } from '$lib/utils';
	import { getContext } from 'svelte';
	const t: (key: string, params?: Record<string, string | number>) => string = getContext('t');

	interface Props {
		data: {
			kvks: any[];
			kvkStats: {
				versionCount: number;
				playerCount: number;
				bonusCount: number;
				lastImport: number | null;
			}[];
		};
		form: any;
	}
	let { data, form }: Props = $props();
	let showCreate = $state(false);
	let creating = $state(false);

	function statusBadge(status: string) {
		switch (status) {
			case 'active': return { class: 'bg-green-500/20 text-green-400', label: t('c.active') };
			case 'draft': return { class: 'bg-yellow-500/20 text-yellow-400', label: t('kvks.draft') };
			case 'archived': return { class: 'bg-gray-500/20 text-gray-400', label: t('c.archived') };
			default: return { class: 'bg-rok-surface text-rok-muted', label: status };
		}
	}

	function formatDate(ts: number | null) {
		if (!ts) return '-';
		return new Date(ts * 1000).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
	}
</script>

<svelte:head>
	<title>KvKs - Admin</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<h1 class="text-xl font-bold">{t('kvks.title')}</h1>
		<button class="btn-primary text-sm" onclick={() => (showCreate = !showCreate)}>
			{showCreate ? t('kvks.close') : t('kvks.createNew')}
		</button>
	</div>

	{#if form?.error}
		<div class="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">
			{form.error}
		</div>
	{/if}

			{#if form?.created}
		<div class="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-3 py-2">
			{t('kvks.createdSuccess')} <a href="/admin/kvks/{form.slug}" class="underline text-rok-accent">{t('kvks.viewDetail')}</a>
		</div>
	{/if}

	{#if showCreate}
		<div class="card">
			<h2 class="text-sm font-medium text-rok-muted mb-3">{t('kvks.createTitle')}</h2>
			<form method="POST" action="?/create" use:enhance={() => {
				creating = true;
				return async ({ update }) => {
					creating = false;
					await update();
				};
			}}>
				<div class="space-y-3">
					<div>
						<label for="kvk-name" class="text-sm text-rok-text block mb-1">{t('kvks.nameLabel')}</label>
						<input
							id="kvk-name"
							name="name"
							type="text"
							placeholder={t('kvks.namePlaceholder')}
							class="input w-full"
							required
						/>
					</div>
					<div>
						<label for="kvk-desc" class="text-sm text-rok-text block mb-1">{t('kvks.descLabel')}</label>
						<textarea
							id="kvk-desc"
							name="description"
							placeholder={t('kvks.descPlaceholder')}
							class="input w-full h-20 resize-none"
						></textarea>
					</div>
					<button type="submit" class="btn-primary" disabled={creating}>
						{creating ? t('kvks.creating') : t('kvks.createBtn')}
					</button>
				</div>
			</form>
		</div>
	{/if}

	<!-- KvK List -->
	{#if data.kvks.length === 0}
		<div class="card text-center py-8 text-rok-muted text-sm">
			{t('kvks.empty')}
		</div>
	{:else}
		<div class="grid gap-3">
			{#each data.kvks as kvk, i}
				{@const stats = data.kvkStats[i]}
				{@const badge = statusBadge(kvk.status)}
				<a
					href="/admin/kvks/{kvk.slug}"
					class="card hover:border-rok-accent/50 transition-colors block"
				>
					<div class="flex items-start justify-between gap-3">
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2 mb-1">
								<h3 class="font-bold text-rok-text truncate">{kvk.name}</h3>
								<span class="text-xs px-2 py-0.5 rounded-full {badge.class}">{badge.label}</span>
								{#if kvk.slug === 'legacy-current'}
									<span class="text-xs px-2 py-0.5 rounded-full bg-rok-accent/20 text-rok-accent">{t('kvks.legacy')}</span>
								{/if}
							</div>
							{#if kvk.description}
								<p class="text-sm text-rok-muted truncate">{kvk.description}</p>
							{/if}
						</div>
						<div class="flex gap-4 text-xs text-rok-dim shrink-0">
							<div class="text-center">
								<div class="font-bold text-rok-text text-sm">{stats.versionCount}</div>
								<div>{t('c.versions')}</div>
							</div>
							<div class="text-center">
								<div class="font-bold text-rok-text text-sm">{formatNumber(stats.playerCount)}</div>
								<div>{t('c.players')}</div>
							</div>
							<div class="text-center">
								<div class="font-bold text-rok-text text-sm">{stats.bonusCount}</div>
								<div>{t('kvks.bonus')}</div>
							</div>
						</div>
					</div>
					<div class="mt-2 text-xs text-rok-dim">
						{t('kvks.createdAt')} {formatDate(kvk.created_at)}
						{#if stats.lastImport}
							· {t('kvks.lastImport')} {formatDate(stats.lastImport)}
						{/if}
						{#if kvk.active_version_id}
							· <span class="text-rok-accent">{t('kvks.hasActive')}</span>
						{/if}
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>
