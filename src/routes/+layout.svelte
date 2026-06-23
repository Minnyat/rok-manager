<script lang="ts">
	import '../app.css';
	import Navbar from '$lib/components/Navbar.svelte';
	import KvkSelector from '$lib/components/KvkSelector.svelte';
	import NavProgress from '$lib/components/NavProgress.svelte';
	import type { Snippet } from 'svelte';
	import { setContext } from 'svelte';
	import { t, type Lang } from '$lib/i18n';
	import { invalidateAll } from '$app/navigation';
	import { navigating } from '$app/stores';

	interface Props {
		data: { user: App.Locals['user']; lang: Lang; kvks: any[]; selectedKvk: any; kingdom: any };
		children: Snippet;
	}

	let { data, children }: Props = $props();

	let lang: Lang = $derived(data.lang);

	setContext('lang', () => lang);
	setContext('t', (key: string, params?: Record<string, string | number>) => t(lang, key, params));

	async function toggleLang() {
		const newLang = lang === 'vi' ? 'en' : 'vi';
		await fetch('/api/lang', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lang: newLang }) });
		lang = newLang;
		await invalidateAll();
	}
</script>

<div class="min-h-screen flex flex-col">
	<NavProgress />
	<Navbar user={data.user} kingdom={data.kingdom} {lang} {toggleLang} />
	{#if data.user}
		<KvkSelector kvks={data.kvks ?? []} selectedKvk={data.selectedKvk} />
	{/if}
	<main
		class="flex-1 max-w-5xl mx-auto w-full px-4 py-6 transition-opacity duration-200"
		class:opacity-50={$navigating}
		class:pointer-events-none={$navigating}
	>
		{@render children()}
	</main>
</div>
