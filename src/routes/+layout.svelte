<script lang="ts">
	import '../app.css';
	import Navbar from '$lib/components/Navbar.svelte';
	import NavProgress from '$lib/components/NavProgress.svelte';
	import DonatePopup from '$lib/components/DonatePopup.svelte';
	import type { Snippet } from 'svelte';
	import { setContext } from 'svelte';
	import { t, type Lang } from '$lib/i18n';
	import { config } from '$lib/config';
	import { invalidateAll } from '$app/navigation';
	import { navigating } from '$app/stores';

	interface Props {
		data: { user: App.Locals['user']; lang: Lang; kingdom: any };
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

	<main
		class="flex-1 max-w-5xl mx-auto w-full px-4 py-6 transition-opacity duration-200"
		class:opacity-50={$navigating}
		class:pointer-events-none={$navigating}
	>
		{@render children()}
	</main>

	<DonatePopup />

	<footer class="border-t border-rok-border/50 bg-rok-surface/30 mt-auto">
		<div class="max-w-5xl mx-auto px-4 py-5 grid grid-cols-1 md:grid-cols-3 gap-4 items-center text-xs text-rok-dim">
			<!-- Branding -->
			<div class="flex flex-col gap-1 items-center md:items-start">
				<span class="font-semibold text-rok-text/80 text-sm">⚔️ {config.kingdomName}</span>
				<span>{t(lang, 'landing.tagline')}</span>
			</div>

			<!-- Donate CTA -->
			<div class="flex justify-center">
				<a href="/donate" class="flex items-center gap-2 px-4 py-2 rounded-lg border border-rok-border/60 bg-rok-card/40 hover:border-rok-accent/50 hover:bg-rok-card hover:text-rok-accent transition-all duration-150">
					<span>☕</span>
					<span>{t(lang, 'don.navLink')}</span>
				</a>
			</div>

			<!-- Author -->
			<div class="flex flex-col gap-1 items-center md:items-end">
				<span>Built by <a href="https://minnyat.dev" target="_blank" rel="noopener noreferrer" class="text-rok-muted hover:text-rok-accent transition-colors underline underline-offset-2">minnyat.dev</a></span>
				<div class="flex items-center gap-2">
					<a href="https://www.facebook.com/MinNyat.me/" target="_blank" rel="noopener noreferrer" class="hover:text-rok-accent transition-colors">Facebook</a>
					<span class="text-rok-border">·</span>
					<span>Discord: minnyat</span>
				</div>
			</div>
		</div>
	</footer>
</div>
