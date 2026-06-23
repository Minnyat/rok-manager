<script lang="ts">
	import { enhance } from '$app/forms';
	import { getContext } from 'svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	const t: (key: string, params?: Record<string, string | number>) => string = getContext('t');

	let { data, form }: { data: any; form: any } = $props();
	let busy = $state(false);
</script>

<svelte:head><title>{t('auction.admin.title')}</title></svelte:head>

<div class="space-y-4 max-w-xl">
	<h1 class="text-xl font-bold">{t('auction.admin.title')}</h1>
	<p class="text-sm text-rok-dim">{t('auction.admin.hint')}</p>

	{#if form?.error}
		<div class="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">{form.error}</div>
	{/if}
	{#if form?.saved}
		<div class="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-3 py-2">{t('auction.msg.saved')}</div>
	{/if}

	<form method="POST" action="?/save" use:enhance={() => { busy = true; return async ({ update }) => { busy = false; await update(); }; }} class="card">
		<div class="grid grid-cols-3 gap-3">
			{#each data.rewards as r}
				<label class="block">
					<span class="text-xs text-rok-dim block mb-1">{t('auction.col.rank')} {r.rank}</span>
					<input name="rank_{r.rank}" type="number" min="0" step="1" value={r.sculptures} class="input w-full text-right" />
				</label>
			{/each}
		</div>
		<button type="submit" class="btn-primary mt-4 inline-flex items-center gap-1.5" disabled={busy}>
			{#if busy}<Spinner size={16} />{/if}{t('c.save')}
		</button>
	</form>
</div>
