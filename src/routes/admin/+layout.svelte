<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { getContext } from 'svelte';
	const t: (key: string, params?: Record<string, string | number>) => string = getContext('t');

	interface Props {
		data: { isSystemAdmin: boolean; manageKingdomId: number | null; kingdomRole: string | null };
		children: Snippet;
	}
	let { data, children }: Props = $props();

	const allLinks = [
		{ href: '/admin', labelKey: 'anav.overview', adminOnly: true },
		{ href: '/admin/kingdoms', labelKey: 'anav.kingdoms', adminOnly: true },
		{ href: '/admin/kvks', labelKey: 'anav.kvks', adminOnly: false },
		{ href: '/admin/auction', labelKey: 'auction.tab', adminOnly: false },
		{ href: '/admin/kingdom', labelKey: 'kdcfg.tab', adminOnly: false },
		{ href: '/admin/members', labelKey: 'anav.members', adminOnly: false },
		{ href: '/admin/mge-rewards', labelKey: 'auction.adminTab', adminOnly: true },
		{ href: '/admin/users', labelKey: 'anav.users', adminOnly: true },
		{ href: '/admin/accounts', labelKey: 'anav.accounts', adminOnly: true },
	];

	let links = $derived(allLinks.filter((l) => !l.adminOnly || data.isSystemAdmin));
</script>

<div>
	<nav class="flex gap-1 overflow-x-auto pb-4 mb-4 border-b border-rok-border">
		{#each links as link}
			<a
				href={link.href}
				class="px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors
					{$page.url.pathname === link.href ? 'bg-rok-accent text-rok-bg font-medium' : 'text-rok-muted hover:bg-rok-surface'}"
			>
				{t(link.labelKey)}
			</a>
		{/each}
	</nav>
	{@render children()}
</div>
