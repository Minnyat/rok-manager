<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	interface Props {
		kvks: any[];
		selectedKvk: any;
	}
	let { kvks, selectedKvk }: Props = $props();

	// Pages that don't use kvkId — switching KvK on these has no effect so we navigate to their base path
	const KVK_AGNOSTIC = ['/auction'];

	async function switchKvk(kvkId: number) {
		const url = new URL($page.url);
		if (KVK_AGNOSTIC.some(p => url.pathname === p || url.pathname.startsWith(p + '/'))) {
			url.search = '';
		} else {
			url.searchParams.set('kvkId', String(kvkId));
			url.searchParams.delete('page');
		}
		await goto(url.toString(), { invalidateAll: true });
	}
</script>

{#if kvks.length > 1}
	<div class="bg-rok-surface/50 border-b border-rok-border/50">
		<div class="max-w-5xl mx-auto px-4 py-1.5 flex items-center gap-2 overflow-x-auto">
			<span class="text-xs text-rok-dim shrink-0">KvK:</span>
			{#each kvks as kvk}
				<button
					class="text-xs px-2 py-1 rounded-md whitespace-nowrap transition-colors
						{selectedKvk?.id === kvk.id
							? 'bg-rok-accent/20 text-rok-accent font-medium'
							: 'text-rok-muted hover:bg-rok-surface hover:text-rok-text'}"
					onclick={() => switchKvk(kvk.id)}
				>
					{kvk.name}
					{#if kvk.status === 'archived'}
						<span class="text-rok-dim">(archive)</span>
					{/if}
				</button>
			{/each}
		</div>
	</div>
{:else if kvks.length === 1 && selectedKvk}
	<!-- Single KvK, show name only -->
	<div class="bg-rok-surface/30 border-b border-rok-border/30">
		<div class="max-w-5xl mx-auto px-4 py-1 flex items-center gap-2">
			<span class="text-xs text-rok-dim">KvK:</span>
			<span class="text-xs text-rok-accent">{selectedKvk.name}</span>
		</div>
	</div>
{/if}
