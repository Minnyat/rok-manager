<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatDate } from '$lib/utils';
	import { getContext } from 'svelte';
	const t: (key: string, params?: Record<string, string | number>) => string = getContext('t');

	interface Props {
		data: { versions: any[] };
		form: any;
	}
	let { data, form }: Props = $props();
	let uploading = $state(false);
	let fileName = $state('');

	function onFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		fileName = input.files?.[0]?.name ?? '';
	}
</script>

<svelte:head>
	<title>Import Data - Admin</title>
</svelte:head>

<div class="space-y-6">
	<h1 class="text-xl font-bold">{t('ai.title')}</h1>

	<div class="card">
		<h2 class="text-sm font-medium text-rok-muted mb-3">{t('ai.uploadTitle')}</h2>

		{#if form?.error}
			<div class="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2 mb-3">
				{form.error}
			</div>
		{/if}
		{#if form?.success}
			<div class="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-3 py-2 mb-3">
				{t('ai.importSuccess', { count: form.rowCount, name: form.versionName })}
			</div>
			{#if form.warnings?.length > 0}
				<div class="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm rounded-lg px-3 py-2 mb-3">
					<p class="font-medium mb-1">{t('ai.warnings')} ({form.warnings.length}):</p>
					<ul class="list-disc list-inside text-xs space-y-0.5">
						{#each form.warnings as w}
							<li>{w}</li>
						{/each}
					</ul>
				</div>
			{/if}
		{/if}

		<form method="POST" action="?/upload" enctype="multipart/form-data" use:enhance={() => {
			uploading = true;
			return async ({ update }) => {
				uploading = false;
				await update();
			};
		}}>
			<div class="space-y-3">
				<div>
					<label for="name" class="block text-sm text-rok-muted mb-1">{t('ai.versionName')}</label>
					<input id="name" name="name" type="text" class="input" placeholder={t('ai.versionPlaceholder')} required />
				</div>
				<div>
					<label class="block text-sm text-rok-muted mb-1">{t('ai.fileLabel')}</label>
					<label class="flex items-center justify-center border-2 border-dashed border-rok-border rounded-lg p-6 cursor-pointer hover:border-rok-accent transition-colors">
						<div class="text-center">
							{#if fileName}
								<p class="text-sm text-rok-accent">{fileName}</p>
							{:else}
								<p class="text-rok-muted text-sm">{t('ai.fileSelect')}</p>
							{/if}
						</div>
						<input type="file" name="file" accept=".csv" class="hidden" onchange={onFileSelect} required />
					</label>
				</div>
				<button type="submit" class="btn-primary w-full" disabled={uploading}>
					{uploading ? t('ai.importing') : t('ai.importBtn')}
				</button>
			</div>
		</form>
	</div>

	{#if data.versions.length > 0}
		<div>
			<h2 class="text-sm font-medium text-rok-muted mb-2">{t('ai.history')}</h2>
			<div class="space-y-2">
				{#each data.versions as v}
					<div class="card flex items-center justify-between">
						<div>
							<div class="flex items-center gap-2">
								<span class="font-medium text-sm">{v.name}</span>
								{#if v.is_active}
									<span class="badge-green">Active</span>
								{/if}
							</div>
							<p class="text-xs text-rok-dim">{v.filename} • {v.row_count} rows • {formatDate(v.imported_at)}</p>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
