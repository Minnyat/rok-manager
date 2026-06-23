<script lang="ts">
	import { enhance } from '$app/forms';
	import { getContext } from 'svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import type { DonateMethod } from '$lib/server/donate';

	const t: (key: string) => string = getContext('t');

	let { data, form }: { data: { methods: DonateMethod[] }; form: any } = $props();

	let busy = $state(false);
	let showForm = $state(false);
	let editTarget = $state<DonateMethod | null>(null);
	let selectedType = $state('bank');
	let qrUrl = $state('');
	let confirmDeleteId = $state<number | null>(null);

	// Which fields are relevant per type
	const showAccountFields = $derived(['bank', 'ewallet', 'other'].includes(selectedType));
	const showQrField       = $derived(['bank', 'ewallet', 'other'].includes(selectedType));
	const showPaymentLink   = $derived(['paypal', 'crypto', 'other'].includes(selectedType));

	function openCreate() {
		editTarget = null;
		selectedType = 'bank';
		qrUrl = '';
		showForm = true;
	}

	function openEdit(m: DonateMethod) {
		editTarget = m;
		selectedType = m.type;
		qrUrl = m.qr_data ?? '';
		showForm = true;
	}

	function resetForm() {
		showForm = false;
		editTarget = null;
		qrUrl = '';
	}

	// Manual close (Cancel / Esc / click backdrop): also discard any stale error banner
	function closeForm() {
		resetForm();
		form = null;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key !== 'Escape' || busy) return;
		if (showForm) closeForm();
		else if (confirmDeleteId !== null) confirmDeleteId = null;
	}

	const typeLabel: Record<string, string> = {
		bank:    t('don.type.bank'),
		ewallet: t('don.type.ewallet'),
		paypal:  t('don.type.paypal'),
		crypto:  t('don.type.crypto'),
		other:   t('don.type.other'),
	};
</script>

<svelte:head><title>{t('adon.title')}</title></svelte:head>
<svelte:window onkeydown={handleKeydown} />

<div class="space-y-4 max-w-2xl">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-xl font-bold">{t('adon.title')}</h1>
			<p class="text-sm text-rok-dim mt-0.5">{t('adon.subtitle')}</p>
		</div>
		<div class="flex items-center gap-2">
			<a href="/donate" target="_blank" class="btn-ghost text-sm text-rok-accent">{t('adon.previewPage')}</a>
			<button class="btn-primary text-sm" onclick={openCreate}>{t('adon.addBtn')}</button>
		</div>
	</div>

	{#if form?.error && !showForm}
		<div class="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">{form.error}</div>
	{/if}
	{#if form?.saved && !showForm}
		<div class="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-3 py-2">{t('adon.saved')}</div>
	{/if}
	{#if form?.deleted}
		<div class="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-3 py-2">{t('adon.deleted')}</div>
	{/if}

	<!-- Method list -->
	{#if data.methods.length === 0}
		<div class="card text-center py-8 text-rok-dim text-sm">{t('adon.empty')}</div>
	{:else}
		<div class="space-y-2">
			{#each data.methods as m (m.id)}
				<div class="card flex items-start gap-4">
					<!-- QR thumbnail -->
					<div class="w-16 h-16 rounded-lg border border-rok-border overflow-hidden shrink-0 bg-white/5 flex items-center justify-center">
						{#if m.qr_data}
							<img src={m.qr_data} alt="QR" class="w-full h-full object-contain" />
						{:else}
							<span class="text-2xl">📷</span>
						{/if}
					</div>

					<!-- Info -->
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2 flex-wrap">
							<span class="font-semibold">{m.name}</span>
							<span class="text-xs px-1.5 py-0.5 rounded border {m.type === 'bank' ? 'border-rok-blue/40 text-rok-blue' : m.type === 'ewallet' ? 'border-rok-green/40 text-rok-green' : 'border-rok-border text-rok-muted'}">
								{typeLabel[m.type] ?? m.type}
							</span>
							{#if !m.is_active}
								<span class="text-xs px-1.5 py-0.5 rounded border border-rok-border text-rok-dim">ẩn</span>
							{/if}
						</div>
						{#if m.bank_name}<p class="text-sm text-rok-muted mt-0.5">{m.bank_name}</p>{/if}
						{#if m.account_number}<p class="text-sm font-mono text-rok-accent">{m.account_number}</p>{/if}
						{#if m.account_name}<p class="text-xs text-rok-dim">{m.account_name}</p>{/if}
						{#if m.qr_data}
							<p class="text-xs text-rok-dim mt-1 truncate max-w-xs" title={m.qr_data}>{m.qr_data}</p>
						{/if}
					</div>

					<!-- Actions -->
					<div class="flex flex-col gap-1.5 shrink-0">
						<button class="btn-ghost text-xs" onclick={() => openEdit(m)}>{t('adon.editBtn')}</button>
						<button class="btn-ghost text-xs text-rok-red" onclick={() => (confirmDeleteId = m.id)}>
							{t('adon.deleteBtn')}
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Delete confirm -->
	{#if confirmDeleteId !== null}
		<!-- Backdrop click closes; Esc handled at window level (keyboard equivalent) -->
		<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
		<div
			class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
			onclick={() => { if (!busy) confirmDeleteId = null; }}
			role="dialog"
			aria-modal="true"
			tabindex="-1"
		>
			<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
			<div class="card max-w-sm w-full space-y-4" onclick={(e) => e.stopPropagation()}>
				<p class="font-medium">{t('adon.confirmDelete')}</p>
				<div class="flex gap-2 justify-end">
					<button class="btn-ghost text-sm" onclick={() => (confirmDeleteId = null)}>{t('adon.cancelBtn')}</button>
					<form method="POST" action="?/delete" use:enhance={() => {
						busy = true;
						return async ({ update }) => { busy = false; confirmDeleteId = null; await update(); };
					}}>
						<input type="hidden" name="id" value={confirmDeleteId} />
						<button type="submit" class="btn-primary text-sm bg-rok-red/20 text-rok-red border-rok-red/30 hover:bg-rok-red/30" disabled={busy}>
							{#if busy}<Spinner size={14} />{/if}{t('adon.deleteBtn')}
						</button>
					</form>
				</div>
			</div>
		</div>
	{/if}

	<!-- Create / Edit form modal -->
	{#if showForm}
		<!-- Backdrop click closes; Esc handled at window level (keyboard equivalent) -->
		<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
		<div
			class="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto"
			onclick={() => { if (!busy) closeForm(); }}
			role="dialog"
			aria-modal="true"
			tabindex="-1"
		>
			<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
			<div class="card max-w-lg w-full my-8 space-y-4" onclick={(e) => e.stopPropagation()}>
				<h2 class="font-bold text-base">{editTarget ? t('adon.editTitle') : t('adon.createTitle')}</h2>

				{#if form?.error}
					<div class="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">{form.error}</div>
				{/if}

				<form
					method="POST"
					action={editTarget ? '?/update' : '?/create'}
					use:enhance={() => {
						busy = true;
						return async ({ update, result }) => {
							busy = false;
							await update();
							if (result.type === 'success' && (result.data as any)?.saved) resetForm();
						};
					}}
					class="space-y-3"
				>
					{#if editTarget}<input type="hidden" name="id" value={editTarget.id} />{/if}

					<!-- Name -->
					<label class="block">
						<span class="text-xs text-rok-dim block mb-1">{t('adon.nameLabel')}</span>
						<input name="name" type="text" class="input w-full" placeholder={t('adon.namePlaceholder')} value={editTarget?.name ?? ''} required />
					</label>

					<!-- Type -->
					<label class="block">
						<span class="text-xs text-rok-dim block mb-1">{t('adon.typeLabel')}</span>
						<select name="type" class="input w-full" bind:value={selectedType}>
							<option value="bank">{t('don.type.bank')}</option>
							<option value="ewallet">{t('don.type.ewallet')}</option>
							<option value="paypal">{t('don.type.paypal')}</option>
							<option value="crypto">{t('don.type.crypto')}</option>
							<option value="other">{t('don.type.other')}</option>
						</select>
					</label>

					<!-- Bank / wallet brand name — always shown (PayPal = "PayPal", crypto = coin name) -->
					<label class="block">
						<span class="text-xs text-rok-dim block mb-1">
							{selectedType === 'crypto' ? 'Tên coin / mạng' : selectedType === 'paypal' ? 'Tên hiển thị' : t('adon.bankNameLabel')}
						</span>
						<input name="bank_name" type="text" class="input w-full"
							placeholder={selectedType === 'crypto' ? 'Bitcoin, USDT TRC-20...' : selectedType === 'paypal' ? 'PayPal' : 'MB Bank, Vietcombank, MoMo...'}
							value={editTarget?.bank_name ?? ''} />
					</label>

					<!-- Account fields: chỉ hiện cho bank / ewallet / other -->
					{#if showAccountFields}
						<label class="block">
							<span class="text-xs text-rok-dim block mb-1">{t('adon.accountNumberLabel')}</span>
							<input name="account_number" type="text" class="input w-full font-mono"
								placeholder="0123456789" value={editTarget?.account_number ?? ''} />
						</label>
						<label class="block">
							<span class="text-xs text-rok-dim block mb-1">{t('adon.accountNameLabel')}</span>
							<input name="account_name" type="text" class="input w-full"
								placeholder="NGUYEN VAN A" value={editTarget?.account_name ?? ''} />
						</label>
					{/if}

					<!-- Payment link: PayPal / crypto / other -->
					{#if showPaymentLink}
						<div class="space-y-1.5">
							<label class="block">
								<span class="text-xs text-rok-dim block mb-1">
									{selectedType === 'crypto' ? 'Địa chỉ ví' : t('adon.paymentLinkLabel')}
								</span>
								<input name="payment_link" type="text" class="input w-full text-sm font-mono"
									placeholder={selectedType === 'crypto' ? '0xAbc123... hoặc TXxxxxx...' : 'https://paypal.me/username'}
									value={editTarget?.payment_link ?? ''} />
							</label>
							<p class="text-xs text-rok-dim">{t('adon.paymentLinkHint')}</p>
						</div>
					{/if}

					<!-- Description -->
					<label class="block">
						<span class="text-xs text-rok-dim block mb-1">{t('adon.descLabel')}</span>
						<textarea name="description" class="input w-full h-16 resize-none"
							placeholder={t('adon.descPlaceholder')}>{editTarget?.description ?? ''}</textarea>
					</label>

					<!-- QR URL: bank / ewallet / other -->
					{#if showQrField}
						<div class="space-y-2">
							<label class="block">
								<span class="text-xs text-rok-dim block mb-1">{t('adon.qrLabel')}</span>
								<input name="qr_data" type="url" class="input w-full text-sm"
									placeholder="https://img.vietqr.io/image/MB-0123456789-print.png"
									bind:value={qrUrl} />
							</label>
							<p class="text-xs text-rok-dim">{t('adon.qrHint')}</p>
							{#if qrUrl}
								<div class="flex items-start gap-3 p-3 bg-rok-surface/50 rounded-lg border border-rok-border/50">
									<div class="w-20 h-20 rounded-lg border border-rok-border overflow-hidden bg-white shrink-0">
										<img src={qrUrl} alt="QR preview" class="w-full h-full object-contain"
											onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
									</div>
									<p class="text-xs text-rok-muted break-all flex-1">{qrUrl}</p>
								</div>
							{/if}
						</div>
					{/if}

					<!-- Display order + active -->
					<div class="grid grid-cols-2 gap-3">
						<label class="block">
							<span class="text-xs text-rok-dim block mb-1">{t('adon.orderLabel')}</span>
							<input name="display_order" type="number" min="0" step="1" class="input w-full" value={editTarget?.display_order ?? 0} />
						</label>
						<label class="flex items-center gap-2 pt-5">
							<input name="is_active" type="checkbox" value="1" class="rounded" checked={editTarget ? !!editTarget.is_active : true} />
							<span class="text-sm">{t('adon.activeLabel')}</span>
						</label>
					</div>

					<div class="flex gap-2 pt-1">
						<button type="submit" class="btn-primary text-sm inline-flex items-center gap-1.5" disabled={busy}>
							{#if busy}<Spinner size={14} />{/if}{t('adon.saveBtn')}
						</button>
						<button type="button" class="btn-ghost text-sm" onclick={closeForm} disabled={busy}>{t('adon.cancelBtn')}</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>
