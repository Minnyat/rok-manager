<script lang="ts">
	import { t, type Lang } from '$lib/i18n';

	interface Props {
		user: App.Locals['user'];
		lang: Lang;
		toggleLang: () => void;
	}
	let { user, lang, toggleLang }: Props = $props();
	let menuOpen = $state(false);
</script>

<nav class="sticky top-0 z-50 bg-rok-surface/95 backdrop-blur border-b border-rok-border">
	<div class="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
		<a href="/dashboard" class="flex items-center gap-2 font-bold text-rok-accent text-lg">
			⚔️ ROK Manager
		</a>

		{#if user}
			<!-- Mobile menu button -->
			<button class="md:hidden btn-ghost p-2" onclick={() => (menuOpen = !menuOpen)}>
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					{#if menuOpen}
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					{:else}
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
					{/if}
				</svg>
			</button>

			<!-- Desktop nav -->
			<div class="hidden md:flex items-center gap-1">
				<a href="/dashboard" class="btn-ghost text-sm">{t(lang, 'nav.dashboard')}</a>
				<a href="/accounts" class="btn-ghost text-sm">{t(lang, 'nav.accounts')}</a>
				<a href="/rankings" class="btn-ghost text-sm">{t(lang, 'nav.rankings')}</a>
				{#if user.role === 'admin' || user.role === 'king'}
					<a href="/admin" class="btn-ghost text-sm text-rok-accent">{t(lang, 'nav.admin')}</a>
				{/if}
				<div class="ml-2 pl-2 border-l border-rok-border flex items-center gap-2">
					<span class="text-sm text-rok-muted">{user.username}</span>
					<form method="POST" action="/api/auth/logout">
						<button type="submit" class="btn-ghost text-sm text-rok-red">{t(lang, 'nav.logout')}</button>
					</form>
				</div>
				<button class="btn-ghost text-xs ml-1" onclick={toggleLang}>{t(lang, 'lang.toggle')}</button>
			</div>
		{/if}
	</div>

	<!-- Mobile menu -->
	{#if user && menuOpen}
		<div class="md:hidden border-t border-rok-border bg-rok-surface px-4 pb-3 space-y-1">
			<a href="/dashboard" class="block py-2 text-sm" onclick={() => (menuOpen = false)}>{t(lang, 'nav.dashboard')}</a>
			<a href="/accounts" class="block py-2 text-sm" onclick={() => (menuOpen = false)}>{t(lang, 'nav.accounts')}</a>
			<a href="/rankings" class="block py-2 text-sm" onclick={() => (menuOpen = false)}>{t(lang, 'nav.rankings')}</a>
			{#if user.role === 'admin' || user.role === 'king'}
				<a href="/admin" class="block py-2 text-sm text-rok-accent" onclick={() => (menuOpen = false)}>{t(lang, 'nav.admin')}</a>
			{/if}
			<div class="pt-2 border-t border-rok-border flex items-center justify-between">
				<span class="text-sm text-rok-muted">{user.username}</span>
				<div class="flex items-center gap-2">
					<button class="text-xs text-rok-muted" onclick={toggleLang}>{t(lang, 'lang.toggle')}</button>
					<form method="POST" action="/api/auth/logout">
						<button type="submit" class="text-sm text-rok-red">{t(lang, 'nav.logout')}</button>
					</form>
				</div>
			</div>
		</div>
	{/if}
</nav>
