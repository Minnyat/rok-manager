<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';

	interface Props {
		children: Snippet;
		data: {
			kvk: any;
			stats: any;
		};
	}
	let { children, data }: Props = $props();

	const basePath = $derived(`/admin/kvks/${data.kvk.slug}`);

	const links = [
		{ href: '', label: 'Tổng quan' },
		{ href: '/scores', label: 'Scores' },
		{ href: '/bonuses', label: 'Bonus' },
		{ href: '/import', label: 'Import' },
		{ href: '/versions', label: 'Versions' },
	];
</script>

<div class="space-y-4">
	<!-- Breadcrumb -->
	<div class="flex items-center gap-2 text-sm">
		<a href="/admin/kvks" class="text-rok-muted hover:text-rok-accent">KvKs</a>
		<span class="text-rok-dim">›</span>
		<span class="text-rok-text font-medium">{data.kvk.name}</span>
		{#if data.kvk.status === 'active'}
			<span class="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Active</span>
		{:else if data.kvk.status === 'archived'}
			<span class="text-xs px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400">Archived</span>
		{/if}
	</div>

	<!-- Sub-nav -->
	<nav class="flex gap-1 overflow-x-auto pb-3 border-b border-rok-border">
		{#each links as link}
			{@const href = basePath + link.href}
			<a
				{href}
				class="px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors
					{$page.url.pathname === href ? 'bg-rok-accent text-rok-bg font-medium' : 'text-rok-muted hover:bg-rok-surface'}"
			>
				{link.label}
			</a>
		{/each}
	</nav>

	{@render children()}
</div>
