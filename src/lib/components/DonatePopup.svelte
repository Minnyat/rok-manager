<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { page } from '$app/stores';

	const t: (key: string) => string = getContext('t');

	const SESSION_KEY = 'donate_popup_dismissed';

	let visible = $state(false);

	onMount(() => {
		// Don't show on the donate page itself or admin pages
		const path = $page.url.pathname;
		if (path.startsWith('/donate') || path.startsWith('/admin')) return;

		if (sessionStorage.getItem(SESSION_KEY)) return;

		const timer = setTimeout(() => { visible = true; }, 1800);
		return () => clearTimeout(timer);
	});

	function dismiss() {
		visible = false;
		sessionStorage.setItem(SESSION_KEY, '1');
	}
</script>

{#if visible}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="donate-popup fixed bottom-4 right-4 z-40 max-w-[280px] w-[calc(100vw-2rem)] sm:w-72"
		role="complementary"
	>
		<div class="card shadow-xl shadow-black/40 border-rok-border/80 !p-0 overflow-hidden">
			<!-- Header bar -->
			<div class="flex items-center justify-between px-3 py-2 bg-rok-surface border-b border-rok-border/60">
				<div class="flex items-center gap-1.5 text-xs font-medium text-rok-muted">
					<span>☕</span>
					<span>{t('don.title')}</span>
				</div>
				<button
					onclick={dismiss}
					class="text-rok-dim hover:text-rok-text transition-colors p-0.5 rounded"
					aria-label="Đóng"
				>
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Body -->
			<div class="px-3 py-3">
				<p class="text-xs text-rok-dim leading-relaxed">{t('don.subtitle')}</p>
				<div class="mt-2.5 flex items-center justify-between gap-2">
					<a
						href="/donate"
						onclick={dismiss}
						class="btn-primary text-xs px-3 py-1.5 flex-1 text-center"
					>
						{t('don.navLink')} →
					</a>
					<button
						onclick={dismiss}
						class="text-xs text-rok-dim hover:text-rok-muted transition-colors"
					>
						{t('don.dismissPopup')}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.donate-popup {
		animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	@keyframes slide-up {
		from {
			opacity: 0;
			transform: translateY(16px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.donate-popup {
			animation: none;
		}
	}
</style>
