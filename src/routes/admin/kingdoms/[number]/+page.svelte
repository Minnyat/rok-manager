<script lang="ts">
	import { enhance } from '$app/forms';
	import Spinner from '$lib/components/Spinner.svelte';
	import { getContext } from 'svelte';
	const t: (key: string, params?: Record<string, string | number>) => string = getContext('t');

	interface Props {
		data: { kingdom: any; stats: any; members: any[]; transfers: any[] };
		form: any;
	}
	let { data, form }: Props = $props();

	let saving = $state(false);
	let pending = $state<string | null>(null);

	function fmtMB(bytes: number): string {
		return (bytes / (1024 * 1024)).toFixed(1);
	}

	function roleBadge(role: string): string {
		if (role === 'king') return 'badge-gold';
		if (role === 'r4') return 'badge-blue';
		return 'badge bg-rok-dim/20 text-rok-dim';
	}
</script>

<svelte:head><title>KD {data.kingdom.number} - Admin</title></svelte:head>

<div class="space-y-6">
	<div class="flex items-center gap-2 flex-wrap">
		<a href="/admin/kingdoms" class="text-rok-muted hover:text-rok-text text-sm">← Kingdoms</a>
		<h1 class="text-xl font-bold">KD {data.kingdom.number}</h1>
		{#if data.kingdom.display_name}<span class="text-rok-muted">{data.kingdom.display_name}</span>{/if}
	</div>

	{#if form?.error}
		<div class="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">{form.error}</div>
	{/if}
	{#if form?.saved}
		<div class="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-3 py-2">{t('c.saved')}</div>
	{/if}

	<!-- Resource usage -->
	<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
		<div class="card text-center"><div class="text-2xl font-bold text-rok-accent">{data.stats.memberCount}</div><div class="text-xs text-rok-dim">{t('c.members')}</div></div>
		<div class="card text-center"><div class="text-2xl font-bold text-rok-accent">{data.stats.frozenCount}</div><div class="text-xs text-rok-dim">{t('c.frozen')}</div></div>
		<div class="card text-center"><div class="text-2xl font-bold text-rok-accent">{data.stats.kvkCount}</div><div class="text-xs text-rok-dim">KvK</div></div>
		<div class="card text-center"><div class="text-2xl font-bold text-rok-accent">{fmtMB(data.stats.usedBytes)}<span class="text-sm text-rok-dim">/{fmtMB(data.stats.quotaBytes)}MB</span></div><div class="text-xs text-rok-dim">{t('c.storage')}</div></div>
	</div>

	<!-- Settings -->
	<div class="card">
		<h2 class="text-sm font-medium text-rok-muted mb-3">{t('c.kingdomSettings')}</h2>
		<form method="POST" action="?/updateSettings" use:enhance={() => {
			saving = true;
			return async ({ update }) => {
				saving = false;
				await update();
			};
		}}>
			<div class="flex flex-wrap gap-2 items-end">
				<div>
					<label class="block text-xs text-rok-dim mb-1" for="number">{t('kd2.numberLabel')}</label>
					<input id="number" name="number" class="input w-28" value={data.kingdom.number} inputmode="numeric" autocomplete="off" required />
				</div>
				<div class="flex-1 min-w-[160px]">
					<label class="block text-xs text-rok-dim mb-1" for="displayName">{t('c.displayName')}</label>
					<input id="displayName" name="displayName" class="input w-full" value={data.kingdom.display_name ?? ''} />
				</div>
				<div>
					<label class="block text-xs text-rok-dim mb-1" for="quotaMb">{t('c.quotaMb')}</label>
					<input id="quotaMb" name="quotaMb" class="input w-24" value={data.kingdom.storage_quota_mb} inputmode="numeric" />
				</div>
				<div>
					<label class="block text-xs text-rok-dim mb-1" for="status">{t('c.status')}</label>
					<select id="status" name="status" class="input w-32">
						<option value="active" selected={data.kingdom.status === 'active'}>{t('c.active')}</option>
						<option value="suspended" selected={data.kingdom.status === 'suspended'}>{t('c.suspended')}</option>
						<option value="archived" selected={data.kingdom.status === 'archived'}>{t('c.archived')}</option>
					</select>
				</div>
				<div>
					<label class="block text-xs text-rok-dim mb-1" for="coinKeepPct">{t('kd2.coinKeepPct')}</label>
					<input id="coinKeepPct" name="coinKeepPct" class="input w-24" value={data.kingdom.coin_keep_pct} inputmode="numeric" />
				</div>
				<button type="submit" class="btn-primary inline-flex items-center justify-center gap-1.5" disabled={saving}>
					{#if saving}<Spinner size={16} />{/if}
					{t('c.save')}
				</button>
			</div>
			<p class="text-xs text-rok-dim mt-2">{t('kd2.coinKeepHint')}</p>
		</form>
	</div>

	<!-- Members -->
	<div class="space-y-2">
		<h2 class="text-sm font-medium text-rok-muted">{t('c.members')}</h2>
		{#each data.members as m}
			<div class="card flex items-center justify-between gap-3 flex-wrap">
				<div class="flex items-center gap-2 flex-wrap">
					<span class="font-medium">{m.username ?? `#${m.governor_id}`}</span>
					<span class={roleBadge(m.role)}>{m.role.toUpperCase()}</span>
					{#if m.status === 'frozen'}
						<span class="badge bg-rok-dim/20 text-rok-dim">{t('c.frozen')}</span>
					{:else}
						<span class="badge-green">{t('c.active')}</span>
					{/if}
					<span class="text-xs text-rok-dim">Gov: {m.governor_id}</span>
				</div>
				{#if m.status === 'active' && m.role !== 'king'}
					<form method="POST" action="?/reassignKing" use:enhance={() => {
						pending = `reassign:${m.user_id}`;
						return async ({ update }) => {
							await update();
							pending = null;
						};
					}}>
						<input type="hidden" name="userId" value={m.user_id} />
						<button type="submit" class="btn-ghost text-xs text-rok-accent inline-flex items-center gap-1.5" disabled={pending === `reassign:${m.user_id}`}>
							{#if pending === `reassign:${m.user_id}`}<Spinner size={14} />{/if}
							{t('kd2.setKing')}
						</button>
					</form>
				{/if}
			</div>
		{/each}
		{#if data.members.length === 0}
			<div class="card text-center py-6 text-rok-muted text-sm">{t('c.noMembers')}</div>
		{/if}
	</div>

	<!-- Pending transfers (read-only overview) -->
	{#if data.transfers.length > 0}
		<div class="space-y-2">
			<h2 class="text-sm font-medium text-rok-muted">{t('kd2.pendingTransfers')}</h2>
			{#each data.transfers as tr}
				<div class="card flex items-center justify-between gap-3 flex-wrap text-sm">
					<span>{tr.username} (Gov {tr.governor_id})</span>
					<span class="text-rok-dim text-xs">
						{tr.initiated_by === 'king' ? t('kd2.kingInvited') : t('kd2.requestJoin')} → {t('c.roleLower')} {tr.role}
					</span>
				</div>
			{/each}
		</div>
	{/if}
</div>
