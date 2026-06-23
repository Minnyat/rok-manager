<script lang="ts">
	import { enhance } from '$app/forms';
	import Spinner from '$lib/components/Spinner.svelte';
	import PlayerSearch from '$lib/components/PlayerSearch.svelte';
	import { getContext } from 'svelte';
	const t: (key: string, params?: Record<string, string | number>) => string = getContext('t');

	interface Props {
		data: { kingdom: any; members: any[]; transfers: any[]; resetRequests: any[]; baseUrl: string; isKing: boolean };
		form: any;
	}
	let { data, form }: Props = $props();

	let copiedUrl = $state('');
	let inviting = $state(false);
	let invitingExisting = $state(false);
	let pending = $state<string | null>(null);

	// Selected player for each invite form
	let newPlayer = $state<{ governor_id: number; governor_name: string } | null>(null);
	let exPlayer = $state<{ governor_id: number; governor_name: string } | null>(null);

	function roleBadge(role: string): string {
		if (role === 'king') return 'badge-gold';
		if (role === 'r4') return 'badge-blue';
		return 'badge bg-rok-dim/20 text-rok-dim';
	}
	async function copyInvite(url: string) {
		await navigator.clipboard.writeText(url);
		copiedUrl = url;
		setTimeout(() => (copiedUrl = ''), 2000);
	}
</script>

<svelte:head><title>{t('mem.title')} - KD {data.kingdom.number}</title></svelte:head>

<div class="space-y-6">
	<div class="flex items-center gap-2 flex-wrap">
		<h1 class="text-xl font-bold">{t('mem.title')}</h1>
		<span class="badge-gold">KD {data.kingdom.number}</span>
		<span class="text-xs text-rok-dim">{t('mem.youAre')} {data.isKing ? 'King' : 'R4'}</span>
	</div>

	{#if form?.error}
		<div class="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">{form.error}</div>
	{/if}
	{#if form?.roleUpdated || form?.frozen || form?.approved || form?.rejected || form?.invitedExisting || form?.rejectedRequest}
		<div class="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-3 py-2">{t('c.updated')}</div>
	{/if}

	<!-- One-time password issued: show once so it can be relayed to the member -->
	{#if form?.tempPassword}
		<div class="bg-rok-accent/10 border border-rok-accent/40 text-sm rounded-lg px-3 py-3 space-y-2">
			<p class="font-medium text-rok-accent">{t('au.tempPasswordIssued', { name: form.resetUsername ?? t('mem.aMember') })}</p>
			<div class="flex items-center gap-2">
				<code class="text-lg font-bold tracking-widest break-all flex-1">{form.tempPassword}</code>
				<button class="btn-primary text-xs py-1" onclick={() => copyInvite(form.tempPassword)}>
					{copiedUrl === form.tempPassword ? t('c.copied') : t('c.copy')}
				</button>
			</div>
			<p class="text-xs text-rok-dim">
				{t('mem.tempPasswordHint')}
			</p>
		</div>
	{/if}

	<!-- Pending forgot-password requests routed to this kingdom -->
	{#if data.resetRequests.length > 0}
		<div class="space-y-2">
			<h2 class="text-sm font-medium text-rok-muted">{t('au.resetRequests')}</h2>
			{#each data.resetRequests as r}
				<div class="card flex items-center justify-between gap-3 flex-wrap">
					<div class="text-sm">
						<span class="font-medium">{r.username}</span>
						<span class="text-xs text-rok-dim ml-2">Gov {r.governor_id}</span>
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

	<!-- Invite a new member account -->
	<div class="card">
		<h2 class="text-sm font-medium text-rok-muted mb-3">{t('mem.inviteNew')}</h2>
		{#if form?.success && form?.inviteUrl}
			<div class="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-3 py-2 mb-3">
				<p class="mb-1">{t('mem.inviteLink')}</p>
				<div class="flex items-center gap-2">
					<code class="text-xs break-all flex-1">{form.inviteUrl}</code>
					<button class="btn-primary text-xs py-1" onclick={() => copyInvite(form.inviteUrl)}>
						{copiedUrl === form.inviteUrl ? t('c.copied') : t('c.copy')}
					</button>
				</div>
			</div>
		{/if}
		<form method="POST" action="?/inviteMember" use:enhance={() => {
			inviting = true;
			return async ({ update }) => {
				inviting = false;
				newPlayer = null;
				await update();
			};
		}}>
			<div class="flex flex-wrap gap-2 items-end">
				<div class="w-48">
					<label class="block text-xs text-rok-dim mb-1">{t('mem.searchPlayer')}</label>
					<PlayerSearch
						onselect={(p) => { newPlayer = p; }}
						placeholder={t('mem.searchPlaceholder')}
					/>
				</div>
				<div>
					<label class="block text-xs text-rok-dim mb-1" for="governorId">{t('c.governorId')}</label>
					<input
						id="governorId" name="governorId" class="input w-36"
						placeholder="125392808" inputmode="numeric" autocomplete="off" required
						value={newPlayer?.governor_id ?? ''}
						oninput={() => { newPlayer = null; }}
					/>
				</div>
				<div>
					<label class="block text-xs text-rok-dim mb-1" for="role">{t('c.role')}</label>
					<select id="role" name="role" class="input w-28">
						<option value="member">Member</option>
						{#if data.isKing}<option value="r4">R4</option>{/if}
					</select>
				</div>
				<button type="submit" class="btn-primary inline-flex items-center justify-center gap-1.5" disabled={inviting}>
					{#if inviting}<Spinner size={16} />{/if}
					{t('mem.createInvite')}
				</button>
			</div>
		</form>
	</div>

	<!-- Invite an existing account to move into this kingdom -->
	<div class="card">
		<h2 class="text-sm font-medium text-rok-muted mb-1">{t('mem.inviteExisting')}</h2>
		<p class="text-xs text-rok-dim mb-3">
			{t('mem.inviteExistingHint')}
		</p>
		<form method="POST" action="?/inviteExisting" use:enhance={() => {
			invitingExisting = true;
			return async ({ update }) => {
				invitingExisting = false;
				exPlayer = null;
				await update();
			};
		}}>
			<div class="flex flex-wrap gap-2 items-end">
				<div class="w-48">
					<label class="block text-xs text-rok-dim mb-1">{t('mem.searchPlayer')}</label>
					<PlayerSearch
						onselect={(p) => { exPlayer = p; }}
						placeholder={t('mem.searchPlaceholder')}
					/>
				</div>
				<div>
					<label class="block text-xs text-rok-dim mb-1" for="exGovernorId">{t('c.governorId')}</label>
					<input
						id="exGovernorId" name="governorId" class="input w-36"
						placeholder="125392808" inputmode="numeric" autocomplete="off" required
						value={exPlayer?.governor_id ?? ''}
						oninput={() => { exPlayer = null; }}
					/>
				</div>
				<div>
					<label class="block text-xs text-rok-dim mb-1" for="exRole">{t('c.role')}</label>
					<select id="exRole" name="role" class="input w-28">
						<option value="member">Member</option>
						{#if data.isKing}<option value="r4">R4</option>{/if}
					</select>
				</div>
				<button type="submit" class="btn-primary inline-flex items-center justify-center gap-1.5" disabled={invitingExisting}>
					{#if invitingExisting}<Spinner size={16} />{/if}
					{t('mem.sendInvite')}
				</button>
			</div>
		</form>
	</div>

	<!-- Pending transfers -->
	{#if data.transfers.length > 0}
		<div class="space-y-2">
			<h2 class="text-sm font-medium text-rok-muted">{t('mem.pendingTransfers')}</h2>
			{#each data.transfers as tr}
				<div class="card flex items-center justify-between gap-3 flex-wrap">
					<div class="flex items-center gap-2 flex-wrap text-sm">
						<span class="font-medium">{tr.username}</span>
						<span class="text-xs text-rok-dim">Gov {tr.governor_id}</span>
						<span class="badge bg-rok-surface text-rok-muted text-xs">
							{tr.initiated_by === 'king' ? t('mem.kingInvited') : t('mem.requestedJoin')} • {t('c.roleLower')} {tr.role}
						</span>
					</div>
					<div class="flex gap-1">
						<form method="POST" action="?/approveTransfer" use:enhance={() => {
							pending = `approve:${tr.id}`;
							return async ({ update }) => { await update(); pending = null; };
						}}>
							<input type="hidden" name="transferId" value={tr.id} />
							<button type="submit" class="btn-primary text-xs py-1 inline-flex items-center gap-1.5" disabled={pending === `approve:${tr.id}`}>
								{#if pending === `approve:${tr.id}`}<Spinner size={14} />{/if}
								{t('mem.approve')}
							</button>
						</form>
						<form method="POST" action="?/rejectTransfer" use:enhance={() => {
							pending = `reject:${tr.id}`;
							return async ({ update }) => { await update(); pending = null; };
						}}>
							<input type="hidden" name="transferId" value={tr.id} />
							<button type="submit" class="btn-ghost text-xs text-rok-red inline-flex items-center gap-1.5" disabled={pending === `reject:${tr.id}`}>
								{#if pending === `reject:${tr.id}`}<Spinner size={14} />{/if}
								{t('c.reject')}
							</button>
						</form>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Members list -->
	<div class="space-y-2">
		<h2 class="text-sm font-medium text-rok-muted">{t('mem.list')}</h2>
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
					<div class="flex gap-1 flex-wrap">
						{#if data.isKing}
							{#if m.role === 'member'}
								<form method="POST" action="?/setRole" use:enhance={() => {
									pending = `role:${m.user_id}:r4`;
									return async ({ update }) => { await update(); pending = null; };
								}}>
									<input type="hidden" name="userId" value={m.user_id} />
									<input type="hidden" name="role" value="r4" />
									<button type="submit" class="btn-ghost text-xs text-rok-accent inline-flex items-center gap-1.5" disabled={pending === `role:${m.user_id}:r4`}>
										{#if pending === `role:${m.user_id}:r4`}<Spinner size={14} />{/if}
										{t('mem.promoteR4')}
									</button>
								</form>
							{:else if m.role === 'r4'}
								<form method="POST" action="?/setRole" use:enhance={() => {
									pending = `role:${m.user_id}:member`;
									return async ({ update }) => { await update(); pending = null; };
								}}>
									<input type="hidden" name="userId" value={m.user_id} />
									<input type="hidden" name="role" value="member" />
									<button type="submit" class="btn-ghost text-xs inline-flex items-center gap-1.5" disabled={pending === `role:${m.user_id}:member`}>
										{#if pending === `role:${m.user_id}:member`}<Spinner size={14} />{/if}
										{t('mem.demoteMember')}
									</button>
								</form>
							{/if}
						{/if}
						{#if data.isKing || m.role === 'member'}
							<form method="POST" action="?/resetPassword" use:enhance={() => {
								pending = `reset:${m.user_id}`;
								return async ({ update }) => { await update(); pending = null; };
							}}>
								<input type="hidden" name="userId" value={m.user_id} />
								<button type="submit" class="btn-ghost text-xs text-rok-accent inline-flex items-center gap-1.5" disabled={pending === `reset:${m.user_id}`}>
									{#if pending === `reset:${m.user_id}`}<Spinner size={14} />{/if}
									{t('mem.resetPassword')}
								</button>
							</form>
							<form method="POST" action="?/freeze" use:enhance={() => {
								pending = `freeze:${m.user_id}`;
								return async ({ update }) => { await update(); pending = null; };
							}}>
								<input type="hidden" name="userId" value={m.user_id} />
								<button type="submit" class="btn-ghost text-xs text-rok-red inline-flex items-center gap-1.5" disabled={pending === `freeze:${m.user_id}`}>
									{#if pending === `freeze:${m.user_id}`}<Spinner size={14} />{/if}
									{t('mem.removeFromKd')}
								</button>
							</form>
						{/if}
					</div>
				{/if}
			</div>
		{/each}
		{#if data.members.length === 0}
			<div class="card text-center py-6 text-rok-muted text-sm">{t('c.noMembers')}</div>
		{/if}
	</div>
</div>
