<script lang="ts">
	// Top loading bar shown during client-side navigation (link clicks, goto(),
	// pagination, sorting...). Gives instant feedback so users don't think the
	// site is frozen while a page loads from the server.
	import { navigating } from '$app/stores';
	import { getContext } from 'svelte';
	const t: (key: string, params?: Record<string, string | number>) => string = getContext('t');
</script>

{#if $navigating}
	<div class="np" role="progressbar" aria-label={t('c.loading')}>
		<div class="np-bar"></div>
		<div class="np-glow"></div>
	</div>
{/if}

<style>
	.np {
		position: fixed;
		inset: 0 0 auto 0;
		height: 3px;
		z-index: 100;
		pointer-events: none;
		background: rgba(245, 158, 11, 0.15);
		overflow: hidden;
	}
	.np-bar {
		height: 100%;
		background: linear-gradient(90deg, #f59e0b, #fbbf24);
		transform-origin: left center;
		box-shadow: 0 0 8px rgba(245, 158, 11, 0.6);
		animation: np-grow 8s cubic-bezier(0.05, 0.7, 0.1, 1) forwards;
	}
	/* Trickle: grow fast at first, then crawl toward ~90% while waiting. */
	@keyframes np-grow {
		0% {
			transform: scaleX(0);
		}
		30% {
			transform: scaleX(0.5);
		}
		60% {
			transform: scaleX(0.75);
		}
		100% {
			transform: scaleX(0.9);
		}
	}
	/* Moving shimmer so the bar always feels alive even when stalled. */
	.np-glow {
		position: absolute;
		top: 0;
		left: 0;
		height: 100%;
		width: 120px;
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.55), transparent);
		animation: np-shimmer 1s linear infinite;
	}
	@keyframes np-shimmer {
		from {
			transform: translateX(-120px);
		}
		to {
			transform: translateX(100vw);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.np-bar {
			animation-duration: 1.2s;
		}
		.np-glow {
			display: none;
		}
	}
</style>
