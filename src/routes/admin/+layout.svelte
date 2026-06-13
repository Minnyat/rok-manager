<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';

	interface Props {
		children: Snippet;
	}
	let { children }: Props = $props();

	const links = [
		{ href: '/admin', label: 'Tổng quan' },
		{ href: '/admin/users', label: 'Users' },
		{ href: '/admin/import', label: 'Import' },
		{ href: '/admin/versions', label: 'Versions' },
		{ href: '/admin/scores', label: 'Scores' },
		{ href: '/admin/accounts', label: 'Accounts' },
	];
</script>

<div>
	<nav class="flex gap-1 overflow-x-auto pb-4 mb-4 border-b border-rok-border">
		{#each links as link}
			<a
				href={link.href}
				class="px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors
					{$page.url.pathname === link.href ? 'bg-rok-accent text-rok-bg font-medium' : 'text-rok-muted hover:bg-rok-surface'}"
			>
				{link.label}
			</a>
		{/each}
	</nav>
	{@render children()}
</div>
