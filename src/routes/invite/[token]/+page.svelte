<script lang="ts">
	import { enhance } from '$app/forms';
	import { getContext } from 'svelte';
	const t: (key: string, params?: Record<string, string | number>) => string = getContext('t');

	interface Props {
		data: { governorName: string; governorId: number };
		form: { error?: string; username?: string } | null;
	}
	let { data, form }: Props = $props();
	let loading = $state(false);
</script>

<svelte:head>
	<title>{t('inv.title')} - ROK Manager</title>
</svelte:head>

<div class="flex items-center justify-center min-h-[70vh]">
	<div class="card w-full max-w-sm">
		<div class="text-center mb-6">
			<div class="text-4xl mb-2">🎉</div>
			<h1 class="text-xl font-bold">{t('inv.welcome')}</h1>
			<p class="text-sm text-rok-muted mt-1">{t('inv.activateFor')}</p>
			<p class="text-rok-accent font-semibold mt-1">{data.governorName}</p>
			<p class="text-xs text-rok-dim">ID: {data.governorId}</p>
		</div>

		{#if form?.error}
			<div class="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2 mb-4">
				{form.error}
			</div>
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
					<input
						id="username"
						name="username"
						type="text"
						class="input"
						value={form?.username ?? ''}
						required
						minlength={3}
						autocomplete="username"
					/>
				</div>
				<div>
					<label for="password" class="block text-sm text-rok-muted mb-1">{t('login.password')}</label>
					<input id="password" name="password" type="password" class="input" required minlength={6} autocomplete="new-password" />
				</div>
				<div>
					<label for="confirmPassword" class="block text-sm text-rok-muted mb-1">{t('inv.confirmPassword')}</label>
					<input id="confirmPassword" name="confirmPassword" type="password" class="input" required minlength={6} autocomplete="new-password" />
				</div>
				<button type="submit" class="btn-primary w-full" disabled={loading}>
					{loading ? t('login.loading') : t('inv.activate')}
				</button>
			</div>
		</form>
	</div>
</div>
