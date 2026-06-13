<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		open: boolean;
		title: string;
		onclose: () => void;
		children: Snippet;
	}

	let { open, title, onclose, children }: Props = $props();
</script>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div class="absolute inset-0 bg-black/60" onclick={onclose}></div>
		<div class="relative bg-rok-surface border border-rok-border rounded-xl w-full max-w-md max-h-[85vh] overflow-y-auto">
			<div class="sticky top-0 bg-rok-surface border-b border-rok-border px-4 py-3 flex items-center justify-between rounded-t-xl">
				<h2 class="font-semibold">{title}</h2>
				<button class="btn-ghost p-1" onclick={onclose}>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
			<div class="p-4">
				{@render children()}
			</div>
		</div>
	</div>
{/if}
