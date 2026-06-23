<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatDate } from '$lib/utils';
	import Spinner from '$lib/components/Spinner.svelte';
	import { getContext } from 'svelte';
	const t: (key: string, params?: Record<string, string | number>) => string = getContext('t');

	import { goto } from '$app/navigation';

	interface Props {
		data: { users: any[]; resetRequests: any[]; baseUrl: string; search: string };
		form: any;
	}
	let { data, form }: Props = $props();

	let copiedUrl = $state('');
	let searchQuery = $state(data.search);

	let creatingUser = $state(false);
	let pending = $state<string | null>(null);

	let govSearch = $state('');
	let govResults = $state<any[]>([]);
	let selectedGov = $state<any>(null);
	let showDropdown = $state(false);
	let searchTimer: ReturnType<typeof setTimeout>;

	function onGovInput() {
		selectedGov = null;
		clearTimeout(searchTimer);
		const q = govSearch.trim();
		if (q.length < 2) { govResults = []; showDropdown = false; return; }
		searchTimer = setTimeout(async () => {
			const res = await fetch(`/api/search-governor?q=${encodeURIComponent(q)}`);
			govResults = await res.json();
			showDropdown = govResults.length > 0;
		}, 250);
	}

	function selectGov(g: any) {
		selectedGov = g;
		govSearch = `${g.governor_name} (${g.governor_id})`;
		showDropdown = false;
	}

	function doSearch() {
		const q = searchQuery.trim();
		goto(q ? `/admin/users?q=${encodeURIComponent(q)}` : '/admin/users', { replaceState: true });
	}

	async function copyInvite(url: string) {
		await navigator.clipboard.writeText(url);
		copiedUrl = url;
		setTimeout(() => (copiedUrl = ''), 2000);
	}
</script>

<svelte:head>
	<title>{t('au.title')} - Admin</title>
</svelte:head>

<div class="space-y-6">
	<h1 class="text-xl font-bold">{t('au.title')}</h1>

	<!-- One-time password issued: show once so it can be relayed to the user -->
	{#if form?.tempPassword}
		<div class="bg-rok-accent/10 border border-rok-accent/40 text-sm rounded-lg px-3 py-3 space-y-2">
			<p class="font-medium text-rok-accent">{t('au.tempPasswordIssued', { name: form.resetUsername ?? 'user' })}</p>
			<div class="flex items-center gap-2">
				<code class="text-lg font-bold tracking-widest break-all flex-1">{form.tempPassword}</code>
				<button class="btn-primary text-xs py-1" onclick={() => copyInvite(form.tempPassword)}>
					{copiedUrl === form.tempPassword ? t('au.copied') : t('au.copy')}
				</button>
			</div>
			<p class="text-xs text-rok-dim">
				{t('au.tempPasswordHint')}
			</p>
		</div>
	{/if}

	<!-- Pending forgot-password requests (all kingdoms) -->
	{#if data.resetRequests.length > 0}
		<div class="space-y-2">
			<h2 class="text-sm font-medium text-rok-muted">{t('au.resetRequests')}</h2>
			{#each data.resetRequests as r}
				<div class="card flex items-center justify-between gap-3 flex-wrap">
					<div class="text-sm">
						<span class="font-medium">{r.username}</span>
						<span class="text-xs text-rok-dim ml-2">Gov {r.governor_id}</span>
						{#if r.kingdom_number}<span class="badge bg-rok-surface text-rok-muted text-xs ml-1">KD {r.kingdom_number}</span>{/if}
						{#if r.note}<p class="text-xs text-rok-muted mt-0.5">“{r.note}”</p>{/if}
					</div>
					<div class="flex gap-1">
						<form method="POST" action="?/resolveResetRequest" use:enhance={() => {
							pending = `resolveReset:${r.id}`;
							return async ({ update }) => { await update(); pending = null; };
						}}>
							<input type="hidden" name="requestId" value={r.id} />
							<button type="submit" class="btn-primary text-xs py-1 inline-flex items-center gap-1.5" disabled={pending === `resolveReset:${r.id}`}>
								{#if pending === `resolveReset:${r.id}`}<Spinner size={14} />{/if}
								{t('au.issueNewPassword')}
							</button>
						</form>
						<form method="POST" action="?/rejectResetRequest" use:enhance={() => {
							pending = `rejectReset:${r.id}`;
							return async ({ update }) => { await update(); pending = null; };
						}}>
							<input type="hidden" name="requestId" value={r.id} />
							<button type="submit" class="btn-ghost text-xs text-rok-red inline-flex items-center gap-1.5" disabled={pending === `rejectReset:${r.id}`}>
								{#if pending === `rejectReset:${r.id}`}<Spinner size={14} />{/if}
								{t('c.reject')}
							</button>
						</form>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Create user -->
	<div class="card">
		<h2 class="text-sm font-medium text-rok-muted mb-3">{t('au.createTitle')}</h2>

		{#if form?.error}
			<div class="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2 mb-3">
				{form.error}
			</div>
		{/if}

		{#if form?.inviteUrl}
			<div class="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-3 py-2 mb-3">
				<p class="mb-1">{t('au.inviteCreated')}</p>
				<div class="flex items-center gap-2">
					<code class="text-xs break-all flex-1">{form.inviteUrl}</code>
					<button class="btn-primary text-xs py-1" onclick={() => copyInvite(form.inviteUrl)}>
						{copiedUrl === form.inviteUrl ? t('au.copied') : t('au.copy')}
					</button>
				</div>
			</div>
		{/if}

		<form method="POST" action="?/create" use:enhance={() => {
			creatingUser = true;
			return async ({ update }) => {
				creatingUser = false;
				await update();
			};
		}}>
			<div class="flex flex-wrap gap-2 items-end">
				<div class="relative flex-1 min-w-[200px]">
					<input
						type="text"
						class="input w-full"
						placeholder={t('au.searchPlaceholder')}
						autocomplete="off"
						bind:value={govSearch}
						oninput={onGovInput}
						onfocus={() => govResults.length > 0 && (showDropdown = true)}
						onblur={() => setTimeout(() => showDropdown = false, 200)}
					/>
					{#if showDropdown}
						<div class="absolute z-20 top-full left-0 right-0 mt-1 bg-rok-surface border border-rok-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
							{#each govResults as g}
								<button
									type="button"
									class="w-full px-3 py-2 text-left hover:bg-rok-border/30 flex justify-between items-center text-sm"
									onmousedown={() => selectGov(g)}
								>
									<span>
										<span class="font-medium">{g.governor_name}</span>
										<span class="text-rok-dim ml-1">#{g.governor_id}</span>
									</span>
									<span class="text-rok-accent text-xs">{(g.power / 1e6).toFixed(1)}M</span>
								</button>
							{/each}
						</div>
					{/if}
					<input type="hidden" name="governorId" value={selectedGov?.governor_id || ''} />
				</div>
				<select name="role" class="input w-28">
					<option value="player">Player</option>
					<option value="king">King</option>
				</select>
				<button type="submit" class="btn-primary inline-flex items-center justify-center gap-1.5" disabled={!selectedGov || creatingUser}>
					{#if creatingUser}<Spinner size={16} />{/if}
					{t('au.createBtn')}
				</button>
			</div>
			{#if selectedGov}
				<div class="mt-2 text-xs text-rok-muted">
					{t('au.selected')} <span class="text-rok-accent font-medium">{selectedGov.governor_name}</span> — ID: {selectedGov.governor_id} — Power: {(selectedGov.power / 1e6).toFixed(1)}M
				</div>
			{/if}
		</form>
	</div>

	<!-- User list -->
	<div class="space-y-2">
		{#each data.users as user}
			<div class="card flex flex-col gap-3">
				<div class="flex flex-col md:flex-row md:items-center gap-3">
					<div class="flex-1">
						<div class="flex items-center gap-2 flex-wrap">
							<span class="font-medium">{user.username || t('au.notActivated')}</span>
							{#if user.role === 'admin'}
								<span class="badge-red">Admin</span>
							{:else if user.role === 'king'}
								<span class="badge-gold">King</span>
							{:else}
								<span class="badge-blue">Player</span>
							{/if}
							{#if user.is_active}
								<span class="badge-green">Active</span>
							{:else}
								<span class="badge bg-rok-dim/20 text-rok-dim">Pending</span>
							{/if}

						</div>
						<p class="text-xs text-rok-dim mt-0.5">
							Gov ID: {user.main_governor_id} • Created: {formatDate(user.created_at)}
						</p>
					</div>

					<div class="flex gap-1 flex-shrink-0 flex-wrap items-center">
						{#if !user.is_active && user.invite_token}
							<button
								class="btn-ghost text-xs"
								onclick={() => copyInvite(`${data.baseUrl}/invite/${user.invite_token}`)}
							>
								{copiedUrl.includes(user.invite_token) ? t('au.copied') : t('au.copyLink')}
							</button>
							<form method="POST" action="?/resetInvite" use:enhance={() => {
								pending = `resetInvite:${user.id}`;
								return async ({ update }) => { await update(); pending = null; };
							}}>
								<input type="hidden" name="userId" value={user.id} />
								<button type="submit" class="btn-ghost text-xs inline-flex items-center gap-1.5" disabled={pending === `resetInvite:${user.id}`}>
									{#if pending === `resetInvite:${user.id}`}<Spinner size={14} />{/if}
									{t('au.resetLink')}
								</button>
							</form>
						{/if}
						{#if user.is_active && user.role !== 'admin'}
							<form method="POST" action="?/resetPassword" use:enhance={() => {
								pending = `reset:${user.id}`;
								return async ({ update }) => { await update(); pending = null; };
							}}>
								<input type="hidden" name="userId" value={user.id} />
								<button type="submit" class="btn-ghost text-xs text-rok-accent inline-flex items-center gap-1.5" disabled={pending === `reset:${user.id}`}>
									{#if pending === `reset:${user.id}`}<Spinner size={14} />{/if}
									{t('au.resetPasswordShort')}
								</button>
							</form>
							<form method="POST" action="?/deactivate" use:enhance={() => {
								pending = `deactivate:${user.id}`;
								return async ({ update }) => { await update(); pending = null; };
							}}>
								<input type="hidden" name="userId" value={user.id} />
								<button type="submit" class="btn-ghost text-xs text-rok-red inline-flex items-center gap-1.5" disabled={pending === `deactivate:${user.id}`}>
									{#if pending === `deactivate:${user.id}`}<Spinner size={14} />{/if}
									{t('au.deactivate')}
								</button>
							</form>
						{/if}
					</div>
				</div>
			</div>
		{/each}

		{#if data.users.length === 0}
			<div class="card text-center py-6 text-rok-muted text-sm">
				{t('au.noUsers')}
			</div>
		{/if}
	</div>
</div>
