<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatDate } from '$lib/utils';
	import { getContext } from 'svelte';
	const t: (key: string, params?: Record<string, string | number>) => string = getContext('t');

	interface Props {
		data: {
			kvk: any;
			versions: any[];
		};
		form: any;
	}
	let { data, form }: Props = $props();
</script>

<svelte:head>
	<title>Versions - {data.kvk.name}</title>
</svelte:head>

<div class="space-y-6">
	<h1 class="text-xl font-bold">Versions — {data.kvk.name}</h1>

	{#if form?.activated}
		<div class="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-3 py-2">
			Đã activate version thành công!
		</div>
	{/if}

	{#if data.versions.length === 0}
		<div class="card text-center py-6 text-rok-muted text-sm">
			Chưa có version nào. <a href="/admin/kvks/{data.kvk.slug}/import" class="text-rok-accent underline">Import dữ liệu</a> để bắt đầu.
		</div>
	{:else}
		<div class="space-y-3">
			{#each data.versions as v}
				<div class="card flex items-center justify-between">
					<div class="flex-1">
						<div class="flex items-center gap-2">
							<span class="font-medium">{v.name}</span>
							{#if v.is_active}
								<span class="badge-green">Active</span>
							{/if}
						</div>
						<p class="text-xs text-rok-dim mt-0.5">
							{v.row_count} players • {v.filename} • {formatDate(v.imported_at)}
						</p>
					</div>
					{#if !v.is_active}
						<form method="POST" action="?/activate" use:enhance>
							<input type="hidden" name="versionId" value={v.id} />
							<button type="submit" class="btn-primary text-xs">Activate</button>
						</form>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
