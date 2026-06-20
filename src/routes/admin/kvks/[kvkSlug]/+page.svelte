<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatNumber } from '$lib/utils';
	import { getContext } from 'svelte';
	const t: (key: string, params?: Record<string, string | number>) => string = getContext('t');

	interface Props {
		data: {
			kvk: any;
			stats: any;
			activeVersion: any;
			versions: any[];
		};
		form: any;
	}
	let { data, form }: Props = $props();

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
	<!-- Stats cards -->
	<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
		<div class="card text-center">
			<div class="text-2xl font-bold text-rok-accent">{data.stats.versionCount}</div>
			<div class="text-xs text-rok-muted">Versions</div>
		</div>
		<div class="card text-center">
			<div class="text-2xl font-bold text-rok-accent">{formatNumber(data.stats.playerCount)}</div>
			<div class="text-xs text-rok-muted">Players</div>
		</div>
		<div class="card text-center">
			<div class="text-2xl font-bold text-rok-accent">{data.stats.bonusCount}</div>
			<div class="text-xs text-rok-muted">Bonus Recipients</div>
		</div>
		<div class="card text-center">
			{#if data.activeVersion}
				<div class="text-sm font-bold text-green-400 truncate">{data.activeVersion.name}</div>
				<div class="text-xs text-rok-muted">Active Version</div>
			{:else}
				<div class="text-sm text-rok-dim">-</div>
				<div class="text-xs text-rok-muted">Chưa có active</div>
			{/if}
		</div>
	</div>

	<!-- Quick actions -->
	<div class="card">
		<h2 class="text-sm font-medium text-rok-muted mb-3">Thao tác nhanh</h2>
		<div class="flex flex-wrap gap-2">
			<a href="/admin/kvks/{data.kvk.slug}/import" class="btn-secondary text-sm">
				📥 Import CSV
			</a>
			<a href="/admin/kvks/{data.kvk.slug}/scores" class="btn-secondary text-sm">
				📊 Scores & Config
			</a>
			<a href="/admin/kvks/{data.kvk.slug}/bonuses" class="btn-secondary text-sm">
				🎁 Quản lý Bonus
			</a>
			<a href="/admin/kvks/{data.kvk.slug}/versions" class="btn-secondary text-sm">
				📁 Versions
			</a>
		</div>
	</div>

	<!-- Description -->
	{#if data.kvk.description}
		<div class="card">
			<h2 class="text-sm font-medium text-rok-muted mb-2">Mô tả</h2>
			<p class="text-sm text-rok-text">{data.kvk.description}</p>
		</div>
	{/if}

	<!-- Versions list -->
	<div class="card">
		<div class="flex items-center justify-between mb-3">
			<h2 class="text-sm font-medium text-rok-muted">Versions</h2>
			<a href="/admin/kvks/{data.kvk.slug}/import" class="text-xs text-rok-accent hover:underline">+ Import mới</a>
		</div>

		{#if data.versions.length === 0}
			<p class="text-sm text-rok-dim text-center py-4">Chưa có version nào. Import CSV để bắt đầu.</p>
		{:else}
			<div class="space-y-2">
				{#each data.versions as v}
					<div class="flex items-center justify-between text-sm py-2 border-b border-rok-border/30 last:border-0">
						<div>
							<span class="text-rok-text font-medium">{v.name}</span>
							<span class="text-rok-dim text-xs ml-2">({v.filename})</span>
							{#if data.activeVersion?.id === v.id}
								<span class="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 ml-2">Active</span>
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
