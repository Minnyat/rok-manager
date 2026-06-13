<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatDate } from '$lib/utils';
	import { getContext } from 'svelte';
	const t: (key: string, params?: Record<string, string | number>) => string = getContext('t');

	interface Props {
		data: { links: any[]; reports: any[] };
		form: any;
	}
	let { data, form }: Props = $props();
</script>

<svelte:head>
	<title>Account Links - Admin</title>
</svelte:head>

<div class="space-y-6">
	<h1 class="text-xl font-bold">{t('aa.title')}</h1>

	<!-- Reports -->
	{#if data.reports.some((r) => r.status === 'pending')}
		<div>
			<h2 class="text-sm font-medium text-rok-red mb-2">
				{t('aa.disputes')} ({data.reports.filter((r) => r.status === 'pending').length})
			</h2>
			<div class="space-y-2">
				{#each data.reports.filter((r) => r.status === 'pending') as report}
					<div class="card border-rok-red/30">
						<div class="flex items-start justify-between mb-2">
							<div>
								<p class="text-sm">
									<span class="text-rok-muted">{report.reporter_name}</span> {t('aa.reported')} Governor
									<span class="text-rok-accent font-semibold">#{report.disputed_governor_id}</span>
								</p>
								{#if report.message}
									<p class="text-xs text-rok-dim mt-1">"{report.message}"</p>
								{/if}
								<p class="text-xs text-rok-dim mt-1">{formatDate(report.created_at)}</p>
							</div>
						</div>
						<div class="flex gap-2">
							<form method="POST" action="?/resolve" use:enhance>
								<input type="hidden" name="reportId" value={report.id} />
								<input type="hidden" name="action" value="resolved" />
								<button type="submit" class="btn-primary text-xs">{t('aa.accept')}</button>
							</form>
							<form method="POST" action="?/resolve" use:enhance>
								<input type="hidden" name="reportId" value={report.id} />
								<input type="hidden" name="action" value="rejected" />
								<button type="submit" class="btn-secondary text-xs">{t('aa.reject')}</button>
							</form>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- All links -->
	<div>
		<h2 class="text-sm font-medium text-rok-muted mb-2">{t('aa.allLinks')} ({data.links.length})</h2>
		{#if data.links.length === 0}
			<div class="card text-center py-6 text-rok-muted text-sm">{t('aa.noLinks')}</div>
		{:else}
			<div class="space-y-2">
				{#each data.links as link}
					<div class="card flex items-center justify-between">
						<div>
							<p class="text-sm">
								<span class="text-rok-muted">{link.username}</span> →
								Governor <span class="text-rok-accent">#{link.governor_id}</span>
							</p>
							<p class="text-xs text-rok-dim">{formatDate(link.linked_at)}</p>
						</div>
						<form method="POST" action="?/unlink" use:enhance>
							<input type="hidden" name="linkId" value={link.id} />
							<button type="submit" class="btn-ghost text-xs text-rok-red">{t('aa.unlink')}</button>
						</form>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Resolved reports -->
	{#if data.reports.some((r) => r.status !== 'pending')}
		<div>
			<h2 class="text-sm font-medium text-rok-dim mb-2">{t('aa.history')}</h2>
			<div class="space-y-2">
				{#each data.reports.filter((r) => r.status !== 'pending') as report}
					<div class="card opacity-60">
						<p class="text-sm">
							{report.reporter_name} → #{report.disputed_governor_id}
							{#if report.status === 'resolved'}
								<span class="badge-green ml-1">{t('aa.resolved')}</span>
							{:else}
								<span class="badge-red ml-1">{t('aa.rejected')}</span>
							{/if}
						</p>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
