<script lang="ts">
	import { enhance } from '$app/forms';
	import Spinner from '$lib/components/Spinner.svelte';
	import { appTitle } from '$lib/config';
	import { getContext } from 'svelte';
	const t: (key: string, params?: Record<string, string | number>) => string = getContext('t');

	interface Props {
		data: {
			username: string;
			mainGovernorId: number;
			kingdomRole: string | null;
			mustChange: boolean;
			transfer: {
				currentKingdom: any;
				invites: any[];
				requests: any[];
				governorId: number;
			} | null;
		};
		form: any;
	}
	let { data, form }: Props = $props();
	let saving = $state(false);
	let requesting = $state(false);
	let pending = $state<string | null>(null);
</script>

<svelte:head><title>{appTitle(t('set.title'))}</title></svelte:head>

<div class="max-w-2xl mx-auto space-y-6">
	<h1 class="text-xl font-bold">{t('set.title')}</h1>

	{#if form?.error}
		<div class="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">{form.error}</div>
	{/if}

	<!-- Account summary -->
	<div class="card space-y-1 text-sm">
		<div class="flex justify-between">
			<span class="text-rok-muted">{t('login.username')}</span>
			<span class="font-medium">{data.username}</span>
		</div>
		<div class="flex justify-between">
			<span class="text-rok-muted">{t('c.governorId')}</span>
			<span class="font-medium">{data.mainGovernorId}</span>
		</div>
		{#if data.kingdomRole}
			<div class="flex justify-between">
				<span class="text-rok-muted">{t('c.role')}</span>
				<span class="font-medium uppercase">{data.kingdomRole}</span>
			</div>
		{/if}
	</div>

	<!-- Change password -->
	<div class="card">
		<h2 class="text-sm font-medium text-rok-muted mb-3">
			{data.mustChange ? t('set.setNewPassword') : t('set.changePassword')}
		</h2>

		{#if data.mustChange}
			<div class="bg-rok-accent/10 border border-rok-accent/30 text-rok-accent text-sm rounded-lg px-3 py-2 mb-3">
				{t('set.mustChangeNote')}
			</div>
		{/if}

		{#if form?.changed}
			<div class="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-3 py-2 mb-3">{t('set.changed')}</div>
		{/if}

		<form method="POST" action="?/changePassword" use:enhance={() => {
			saving = true;
			return async ({ update }) => {
				saving = false;
				await update();
			};
		}}>
			<div class="space-y-3">
				{#if !data.mustChange}
					<div>
						<label class="block text-xs text-rok-dim mb-1" for="currentPassword">{t('set.currentPassword')}</label>
						<input id="currentPassword" name="currentPassword" type="password" class="input w-full" autocomplete="current-password" required />
					</div>
				{/if}
				<div>
					<label class="block text-xs text-rok-dim mb-1" for="newPassword">{t('set.newPassword')}</label>
					<input id="newPassword" name="newPassword" type="password" class="input w-full" autocomplete="new-password" minlength="6" required />
				</div>
				<div>
					<label class="block text-xs text-rok-dim mb-1" for="confirmPassword">{t('set.confirmPassword')}</label>
					<input id="confirmPassword" name="confirmPassword" type="password" class="input w-full" autocomplete="new-password" minlength="6" required />
				</div>
				<button type="submit" class="btn-primary w-full inline-flex items-center justify-center gap-1.5" disabled={saving}>
					{#if saving}<Spinner size={16} />{/if}
					{data.mustChange ? t('set.setAndContinue') : t('set.changePassword')}
				</button>
			</div>
		</form>
	</div>

	<!-- Kingdom transfer (members only; hidden during forced password change) -->
	{#if data.transfer}
		<div id="transfer" class="space-y-4 scroll-mt-20">
			<div class="flex items-center gap-2 flex-wrap">
				<h2 class="text-lg font-bold">🔄 {t('tr.title')}</h2>
				<span class="text-sm text-rok-muted">
					{t('tr.current')}
					{#if data.transfer.currentKingdom}
						<span class="badge-gold">KD {data.transfer.currentKingdom.number}</span>
					{:else}
						<span class="text-rok-dim">{t('tr.noKingdom')}</span>
					{/if}
					<span class="text-xs text-rok-dim ml-1">{t('tr.yourGovernor')} {data.transfer.governorId}</span>
				</span>
			</div>

			{#if form?.requested}
				<div class="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-3 py-2">{t('tr.requested')}</div>
			{/if}
			{#if form?.accepted}
				<div class="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-3 py-2">{t('tr.accepted')}</div>
			{/if}
			{#if form?.cancelled || form?.declined}
				<div class="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-3 py-2">{t('c.updated')}</div>
			{/if}

			<!-- Invites from a King/R4 -->
			{#if data.transfer.invites.length > 0}
				<div class="space-y-2">
					<h3 class="text-sm font-medium text-rok-muted">{t('tr.invites')}</h3>
					{#each data.transfer.invites as inv}
						<div class="card flex items-center justify-between gap-3 flex-wrap">
							<div class="text-sm">
								<span class="font-medium">KD {inv.to_number}</span>
								{#if inv.to_name}<span class="text-rok-dim ml-1">{inv.to_name}</span>{/if}
								<span class="badge bg-rok-surface text-rok-muted text-xs ml-2">{t('c.roleLower')} {inv.role}</span>
							</div>
							<div class="flex gap-1">
								<form method="POST" action="?/acceptInvite" use:enhance={() => {
									pending = `accept:${inv.id}`;
									return async ({ update }) => { await update(); pending = null; };
								}}>
									<input type="hidden" name="transferId" value={inv.id} />
									<button type="submit" class="btn-primary text-xs py-1 inline-flex items-center gap-1.5" disabled={pending === `accept:${inv.id}`}>
										{#if pending === `accept:${inv.id}`}<Spinner size={14} />{/if}
										{t('c.accept')}
									</button>
								</form>
								<form method="POST" action="?/declineInvite" use:enhance={() => {
									pending = `decline:${inv.id}`;
									return async ({ update }) => { await update(); pending = null; };
								}}>
									<input type="hidden" name="transferId" value={inv.id} />
									<button type="submit" class="btn-ghost text-xs text-rok-red inline-flex items-center gap-1.5" disabled={pending === `decline:${inv.id}`}>
										{#if pending === `decline:${inv.id}`}<Spinner size={14} />{/if}
										{t('c.reject')}
									</button>
								</form>
							</div>
						</div>
					{/each}
				</div>
			{/if}

			<!-- Request to join -->
			<div class="card">
				<h3 class="text-sm font-medium text-rok-muted mb-1">{t('tr.requestJoinTitle')}</h3>
				<p class="text-xs text-rok-dim mb-3">{t('tr.requestHint')}</p>
				<form method="POST" action="?/requestJoin" use:enhance={() => {
					requesting = true;
					return async ({ update }) => {
						requesting = false;
						await update();
					};
				}}>
					<div class="flex flex-wrap gap-2 items-end">
						<div>
							<label class="block text-xs text-rok-dim mb-1" for="number">{t('tr.targetNumber')}</label>
							<input id="number" name="number" class="input w-32" placeholder="1234" inputmode="numeric" autocomplete="off" required />
						</div>
						<button type="submit" class="btn-primary inline-flex items-center justify-center gap-1.5" disabled={requesting}>
							{#if requesting}<Spinner size={16} />{/if}
							{t('tr.sendRequest')}
						</button>
					</div>
				</form>
			</div>

			<!-- My pending requests -->
			{#if data.transfer.requests.length > 0}
				<div class="space-y-2">
					<h3 class="text-sm font-medium text-rok-muted">{t('tr.pending')}</h3>
					{#each data.transfer.requests as req}
						<div class="card flex items-center justify-between gap-3 flex-wrap">
							<div class="text-sm">
								<span class="font-medium">KD {req.to_number}</span>
								{#if req.to_name}<span class="text-rok-dim ml-1">{req.to_name}</span>{/if}
								<span class="text-xs text-rok-dim ml-2">{t('tr.waitingApproval')}</span>
							</div>
							<form method="POST" action="?/cancelRequest" use:enhance={() => {
								pending = `cancel:${req.id}`;
								return async ({ update }) => { await update(); pending = null; };
							}}>
								<input type="hidden" name="transferId" value={req.id} />
								<button type="submit" class="btn-ghost text-xs text-rok-red inline-flex items-center gap-1.5" disabled={pending === `cancel:${req.id}`}>
									{#if pending === `cancel:${req.id}`}<Spinner size={14} />{/if}
									{t('c.cancel')}
								</button>
							</form>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
