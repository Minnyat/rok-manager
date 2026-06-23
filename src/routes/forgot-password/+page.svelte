<script lang="ts">
	import { enhance } from '$app/forms';
	import Spinner from '$lib/components/Spinner.svelte';
	import { appTitle } from '$lib/config';
	import { getContext } from 'svelte';
	const t: (key: string, params?: Record<string, string | number>) => string = getContext('t');

	interface Props {
		form: { error?: string; sent?: boolean } | null;
	}
	let { form }: Props = $props();
	let loading = $state(false);
</script>

<svelte:head><title>{appTitle(t('fp.title'))}</title></svelte:head>

<div class="flex items-center justify-center min-h-[70vh]">
	<div class="card w-full max-w-sm">
		<div class="text-center mb-6">
			<div class="text-4xl mb-2">🔑</div>
			<h1 class="text-xl font-bold text-rok-accent">{t('fp.title')}</h1>
			<p class="text-sm text-rok-muted mt-1">{t('fp.subtitle')}</p>
		</div>

		{#if form?.sent}
			<div class="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-3 py-2 mb-4">
				{t('fp.sent')}
			</div>
			<a href="/login" class="btn-primary w-full block text-center">{t('fp.backToLogin')}</a>
		{:else}
			{#if form?.error}
				<div class="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2 mb-4">{form.error}</div>
			{/if}

			<form method="POST" use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					loading = false;
					await update();
				};
			}}>
				<div class="space-y-4">
					<div>
						<label for="username" class="block text-sm text-rok-muted mb-1">{t('login.username')}</label>
						<input id="username" name="username" type="text" class="input" autocomplete="username" required />
					</div>
					<div>
						<label for="note" class="block text-sm text-rok-muted mb-1">{t('fp.noteLabel')}</label>
						<textarea id="note" name="note" class="input" rows={2} placeholder={t('fp.notePlaceholder')}></textarea>
					</div>
					<button type="submit" class="btn-primary w-full inline-flex items-center justify-center gap-1.5" disabled={loading}>
						{#if loading}<Spinner size={16} />{/if}
						{t('fp.submit')}
					</button>
				</div>
			</form>

			<div class="text-center mt-4">
				<a href="/login" class="text-sm text-rok-muted hover:text-rok-accent">{t('fp.backLink')}</a>
			</div>
		{/if}
	</div>
</div>
