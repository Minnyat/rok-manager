<script lang="ts">
	import { enhance } from '$app/forms';
	import Spinner from '$lib/components/Spinner.svelte';
	import { getContext } from 'svelte';
	const t: (key: string, params?: Record<string, string | number>) => string = getContext('t');

	interface Props {
		data: { kingdoms: any[]; stats: any[]; baseUrl: string };
		form: any;
	}
	let { data, form }: Props = $props();

	let copiedUrl = $state('');
	let creating = $state(false);

	function fmtMB(bytes: number): string {
		return (bytes / (1024 * 1024)).toFixed(1);
	}
	function pct(used: number, quota: number): number {
		if (!quota) return 0;
		return Math.min(100, Math.round((used / quota) * 100));
	}
	async function copyInvite(url: string) {
		await navigator.clipboard.writeText(url);
		copiedUrl = url;
		setTimeout(() => (copiedUrl = ''), 2000);
	}
</script>

<svelte:head><title>Kingdoms - Admin</title></svelte:head>

<div class="space-y-6">
	<h1 class="text-xl font-bold">👑 Kingdoms</h1>

	<!-- Create kingdom + invite King -->
	<div class="card">
		<h2 class="text-sm font-medium text-rok-muted mb-3">{t('kd.createTitle')}</h2>

		{#if form?.error}
			<div class="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2 mb-3">
				{form.error}
			</div>
		{/if}

		{#if form?.success}
			<div class="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-3 py-2 mb-3">
				<p class="mb-1">{t('kd.created', { number: form.number })}</p>
				<div class="flex items-center gap-2">
					<code class="text-xs break-all flex-1">{form.inviteUrl}</code>
					<button class="btn-primary text-xs py-1" onclick={() => copyInvite(form.inviteUrl)}>
						{copiedUrl === form.inviteUrl ? t('c.copied') : t('c.copy')}
					</button>
				</div>
			</div>
		{/if}

		<form method="POST" action="?/create" use:enhance={() => {
			creating = true;
			return async ({ update }) => {
				creating = false;
				await update();
			};
		}}>
			<div class="flex flex-wrap gap-2 items-end">
				<div>
					<label class="block text-xs text-rok-dim mb-1" for="number">{t('kd.numberLabel')}</label>
					<input id="number" name="number" class="input w-28" placeholder="1234" inputmode="numeric" autocomplete="off" required />
				</div>
				<div class="flex-1 min-w-[160px]">
					<label class="block text-xs text-rok-dim mb-1" for="displayName">{t('c.displayNameOpt')}</label>
					<input id="displayName" name="displayName" class="input w-full" placeholder={t('kd.displayNamePlaceholder')} autocomplete="off" />
				</div>
				<div>
					<label class="block text-xs text-rok-dim mb-1" for="quotaMb">{t('c.quotaMb')}</label>
					<input id="quotaMb" name="quotaMb" class="input w-24" value="100" inputmode="numeric" autocomplete="off" />
				</div>
				<button type="submit" class="btn-primary inline-flex items-center justify-center gap-1.5" disabled={creating}>
					{#if creating}<Spinner size={16} />{/if}
					{t('kd.createInvite')}
				</button>
			</div>
		</form>
	</div>

	<!-- Kingdom list -->
	<div class="space-y-2">
		{#each data.kingdoms as k, i}
			{@const s = data.stats[i]}
			<a href={`/admin/kingdoms/${k.number}`} class="card block hover:border-rok-accent/50 transition-colors">
				<div class="flex items-center justify-between gap-3 flex-wrap">
					<div class="flex items-center gap-2 flex-wrap">
						<span class="font-bold text-rok-accent">KD {k.number}</span>
						{#if k.display_name}<span class="text-sm text-rok-muted">{k.display_name}</span>{/if}
						{#if k.status === 'active'}
							<span class="badge-green">{t('c.active')}</span>
						{:else if k.status === 'suspended'}
							<span class="badge-red">{t('c.suspended')}</span>
						{:else}
							<span class="badge bg-rok-dim/20 text-rok-dim">{t('c.archived')}</span>
						{/if}
						{#if !k.king_user_id}
							<span class="badge bg-yellow-500/15 text-yellow-400">{t('kd.noKing')}</span>
						{/if}
					</div>
					<div class="text-xs text-rok-dim flex gap-3">
						<span>{s.memberCount} {t('kd.membersShort')}{#if s.frozenCount} (+{s.frozenCount} {t('c.frozenLower')}){/if}</span>
						<span>{s.kvkCount} KvK</span>
						<span>{s.versionCount} {t('c.versions')}</span>
					</div>
				</div>

				<!-- Storage usage bar -->
				<div class="mt-3">
					<div class="flex justify-between text-xs text-rok-dim mb-1">
						<span>{t('c.storage')}</span>
						<span>{fmtMB(s.usedBytes)} / {fmtMB(s.quotaBytes)} MB ({pct(s.usedBytes, s.quotaBytes)}%)</span>
					</div>
					<div class="h-1.5 bg-rok-border/40 rounded-full overflow-hidden">
						<div
							class="h-full rounded-full {pct(s.usedBytes, s.quotaBytes) >= 90 ? 'bg-rok-red' : 'bg-rok-accent'}"
							style="width: {pct(s.usedBytes, s.quotaBytes)}%"
						></div>
					</div>
				</div>
			</a>
		{/each}

		{#if data.kingdoms.length === 0}
			<div class="card text-center py-6 text-rok-muted text-sm">{t('kd.empty')}</div>
		{/if}
	</div>
</div>
