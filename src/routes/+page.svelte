<script lang="ts">
	import { config, appTitle } from '$lib/config';
	import { t as tr, type Lang } from '$lib/i18n';

	interface Props {
		data: {
			user: App.Locals['user'];
			lang: Lang;
			kingdom?: { number: string; display_name: string | null } | null;
		};
	}
	let { data }: Props = $props();

	let lang = $derived(data.lang ?? 'vi');
	// Reads `lang` at call time → Svelte tracks it, so text re-renders on toggle.
	const T = (k: string, p?: Record<string, string | number>) => tr(lang, k, p);

	let canManage = $derived(
		!!data.user &&
			(data.user.role === 'admin' ||
				data.user.kingdomRole === 'king' ||
				data.user.kingdomRole === 'r4')
	);

	let features = $derived([
		{ icon: '🔗', title: tr(lang, 'landing.f1Title'), desc: tr(lang, 'landing.f1Desc') },
		{ icon: '📊', title: tr(lang, 'landing.f2Title'), desc: tr(lang, 'landing.f2Desc') },
		{ icon: '🏆', title: tr(lang, 'landing.f3Title'), desc: tr(lang, 'landing.f3Desc') },
		{ icon: '👤', title: tr(lang, 'landing.f4Title'), desc: tr(lang, 'landing.f4Desc') },
		{ icon: '🔄', title: tr(lang, 'landing.f5Title'), desc: tr(lang, 'landing.f5Desc') },
		{ icon: '⚖️', title: tr(lang, 'landing.f6Title'), desc: tr(lang, 'landing.f6Desc') }
	]);

	let steps = $derived([
		{ n: '01', t: tr(lang, 'landing.s1Title'), d: tr(lang, 'landing.s1Desc') },
		{ n: '02', t: tr(lang, 'landing.s2Title'), d: tr(lang, 'landing.s2Desc') },
		{ n: '03', t: tr(lang, 'landing.s3Title'), d: tr(lang, 'landing.s3Desc') }
	]);

	// Illustration: main account + farm account DKP merged.
	const featured = {
		main: { name: 'Governor', power: '142M', dkp: '6.10M' },
		farm: { name: 'Governor · Farm', power: '38M', dkp: '2.32M' },
		total: '8.42M'
	};
	const board = [
		{ rank: 2, name: 'WarLord', power: '128M', dkp: '7.10M' },
		{ rank: 3, name: 'Conqueror', power: '119M', dkp: '6.55M' }
	];
</script>

<svelte:head>
	<title>{appTitle()}</title>
</svelte:head>

{#if data.user}
	<!-- Logged-in welcome -->
	<div class="landing-fade py-8">
		<div class="flex items-center gap-2 mb-2">
			{#if data.kingdom}
				<span class="badge-gold">KD {data.kingdom.number}</span>
			{/if}
			<span class="text-rok-dim text-sm">{T('landing.tagline')}</span>
		</div>
		<h1 class="text-2xl md:text-3xl font-bold mb-1">
			{T('landing.welcomeBack')} <span class="text-rok-accent">{data.user.username}</span>
		</h1>
		<p class="text-rok-muted mb-6">{T('landing.welcomePrompt')}</p>

		<div class="grid grid-cols-2 md:grid-cols-3 gap-3">
			<a href="/dashboard" class="card hover:border-rok-accent/50 transition-colors">
				<div class="text-2xl mb-1">🏰</div>
				<div class="font-medium">{T('nav.dashboard')}</div>
				<div class="text-xs text-rok-dim">{T('landing.cardDashboardDesc')}</div>
			</a>
			<a href="/rankings" class="card hover:border-rok-accent/50 transition-colors">
				<div class="text-2xl mb-1">🏆</div>
				<div class="font-medium">{T('landing.cardRankings')}</div>
				<div class="text-xs text-rok-dim">{T('landing.cardRankingsDesc')}</div>
			</a>
			<a href="/accounts" class="card hover:border-rok-accent/50 transition-colors">
				<div class="text-2xl mb-1">🔗</div>
				<div class="font-medium">{T('landing.cardAccounts')}</div>
				<div class="text-xs text-rok-dim">{T('landing.cardAccountsDesc')}</div>
			</a>
			{#if data.user.role !== 'admin'}
				<a href="/settings#transfer" class="card hover:border-rok-accent/50 transition-colors">
					<div class="text-2xl mb-1">🔄</div>
					<div class="font-medium">{T('landing.cardTransfer')}</div>
					<div class="text-xs text-rok-dim">{T('landing.cardTransferDesc')}</div>
				</a>
			{/if}
			{#if canManage}
				<a href="/admin" class="card border-rok-accent/30 hover:border-rok-accent/60 transition-colors">
					<div class="text-2xl mb-1">⚙️</div>
					<div class="font-medium text-rok-accent">{T('landing.cardAdmin')}</div>
					<div class="text-xs text-rok-dim">{T('landing.cardAdminDesc')}</div>
				</a>
			{/if}
		</div>
	</div>
{:else}
	<!-- Public landing -->
	<div class="relative">
		<!-- Glow backdrop -->
		<div
			class="pointer-events-none absolute inset-x-0 -top-24 h-72 landing-glow"
			aria-hidden="true"
		></div>

		<!-- Hero -->
		<section class="relative grid lg:grid-cols-2 gap-10 items-center pt-10 pb-16">
			<div class="landing-fade">
				<span class="inline-flex items-center gap-2 text-xs font-medium text-rok-muted bg-rok-surface border border-rok-border rounded-full px-3 py-1">
					<span class="relative flex h-2 w-2">
						<span class="absolute inline-flex h-full w-full rounded-full bg-rok-accent opacity-60 landing-ping"></span>
						<span class="relative inline-flex rounded-full h-2 w-2 bg-rok-accent"></span>
					</span>
					{T('landing.eyebrow')}
				</span>

				<h1 class="mt-5 text-4xl md:text-5xl font-extrabold leading-[1.1] tracking-tight">
					{T('landing.heroTitle1')}
					<span class="bg-gradient-to-r from-amber-300 via-rok-accent to-amber-500 bg-clip-text text-transparent">
						{T('landing.heroTitleAccent')}
					</span>
				</h1>

				<p class="mt-4 text-rok-muted text-base md:text-lg max-w-xl">
					{T('landing.heroSub')}
				</p>

				<div class="mt-7 flex flex-wrap items-center gap-3">
					<a href="/login" class="btn-primary text-base px-7 py-3">{T('login.submit')}</a>
					<a href="#features" class="btn-secondary text-base px-6 py-3">{T('landing.viewFeatures')}</a>
				</div>

				<p class="mt-4 text-xs text-rok-dim flex items-center gap-1.5">
					<span>🔒</span> {T('landing.inviteNote')}
				</p>

				<!-- Hierarchy -->
				<div class="mt-8 flex items-center gap-2 text-sm">
					<span class="badge-gold">👑 King</span>
					<span class="text-rok-dim">→</span>
					<span class="badge-blue">🛡️ R4</span>
					<span class="text-rok-dim">→</span>
					<span class="badge bg-rok-card text-rok-muted">⚔️ Member</span>
				</div>
			</div>

			<!-- Mock leaderboard card -->
			<div class="landing-fade landing-delay relative">
				<div class="card bg-rok-card/60 backdrop-blur shadow-2xl shadow-black/40">
					<div class="flex items-center justify-between mb-3">
						<div class="flex items-center gap-2">
							<span class="text-lg">🏆</span>
							<span class="font-semibold">{T('landing.boardTitle')}</span>
						</div>
						<span class="badge-green">KvK Live</span>
					</div>

					<!-- #1: main + farm DKP merged -->
					<div class="rounded-lg bg-rok-surface/70 border border-rok-accent/30 px-3 py-2.5 mb-1.5">
						<div class="flex items-center gap-3">
							<span class="text-sm font-bold w-6 text-center text-amber-400">#1</span>
							<div class="flex-1 min-w-0">
								<div class="font-medium truncate">{featured.main.name}</div>
								<div class="text-xs text-rok-dim">{T('landing.mainAccLabel')} · Power {featured.main.power}</div>
							</div>
							<span class="text-rok-muted text-sm">{featured.main.dkp}</span>
						</div>
						<div class="flex items-center gap-2 mt-1.5 pl-9 text-xs">
							<span class="text-rok-dim">↳ {featured.farm.name}</span>
							<span class="badge bg-rok-accent/15 text-rok-accent">{T('landing.farmBadge')}</span>
							<span class="ml-auto text-rok-muted">+{featured.farm.dkp}</span>
						</div>
						<div class="flex items-center justify-between mt-2 pt-2 border-t border-rok-border">
							<span class="text-xs text-rok-muted">{T('landing.totalDkp')}</span>
							<span class="text-rok-accent font-bold">{featured.total}</span>
						</div>
					</div>

					<!-- other ranks -->
					<div class="space-y-1.5">
						{#each board as r}
							<div class="flex items-center gap-3 rounded-lg bg-rok-surface/70 border border-rok-border px-3 py-2">
								<span class="text-sm font-bold w-6 text-center {r.rank === 2 ? 'text-slate-300' : 'text-amber-700'}">
									#{r.rank}
								</span>
								<div class="flex-1 min-w-0">
									<div class="font-medium truncate">{r.name}</div>
									<div class="text-xs text-rok-dim">Power {r.power}</div>
								</div>
								<span class="text-rok-accent font-semibold text-sm">{r.dkp}</span>
							</div>
						{/each}
					</div>

					<div class="mt-3 flex items-center justify-between text-xs text-rok-dim">
						<span>{T('landing.boardNote')}</span>
						<span class="text-rok-muted">{T('landing.boardUpdate')}</span>
					</div>
				</div>
			</div>
		</section>

		<!-- Features -->
		<section id="features" class="py-12 scroll-mt-20">
			<div class="text-center mb-8">
				<h2 class="text-2xl md:text-3xl font-bold">{T('landing.featuresTitle')}</h2>
				<p class="text-rok-muted mt-2">{T('landing.featuresSub')}</p>
			</div>

			<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
				{#each features as f}
					<div class="card hover:border-rok-accent/40 hover:-translate-y-0.5 transition-all duration-200">
						<div class="w-11 h-11 rounded-xl bg-rok-accent/10 border border-rok-accent/20 flex items-center justify-center text-xl mb-3">
							{f.icon}
						</div>
						<h3 class="font-semibold mb-1">{f.title}</h3>
						<p class="text-sm text-rok-muted leading-relaxed">{f.desc}</p>
					</div>
				{/each}
			</div>
		</section>

		<!-- How it works -->
		<section class="py-12">
			<div class="text-center mb-8">
				<h2 class="text-2xl md:text-3xl font-bold">{T('landing.howTitle')}</h2>
			</div>
			<div class="grid md:grid-cols-3 gap-4">
				{#each steps as s}
					<div class="card relative overflow-hidden">
						<div class="absolute -right-2 -top-3 text-6xl font-black text-rok-border/40 select-none">{s.n}</div>
						<div class="relative">
							<h3 class="font-semibold mb-1">{s.t}</h3>
							<p class="text-sm text-rok-muted leading-relaxed">{s.d}</p>
						</div>
					</div>
				{/each}
			</div>
		</section>

		<!-- CTA band -->
		<section class="py-12">
			<div class="card text-center bg-gradient-to-b from-rok-card/70 to-rok-surface border-rok-accent/20 py-10">
				<div class="text-4xl mb-3">⚔️</div>
				<h2 class="text-2xl md:text-3xl font-bold mb-2">{T('landing.ctaTitle')}</h2>
				<p class="text-rok-muted mb-6">{T('landing.ctaSub')}</p>
				<a href="/login" class="btn-primary text-base px-8 py-3">{T('landing.ctaBtn')}</a>
			</div>
		</section>

		<footer class="py-8 text-center text-xs text-rok-dim border-t border-rok-border/60">
			⚔️ {config.kingdomName} · {T('landing.tagline')}
		</footer>
	</div>
{/if}

<style>
	.landing-glow {
		background: radial-gradient(ellipse 60% 100% at 30% 0%, rgba(245, 158, 11, 0.16), transparent 70%);
	}

	.landing-fade {
		animation: landing-fade-up 0.6s ease-out both;
	}
	.landing-delay {
		animation-delay: 0.12s;
	}

	@keyframes landing-fade-up {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.landing-ping {
		animation: landing-ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
	}
	@keyframes landing-ping {
		75%,
		100% {
			transform: scale(2.2);
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.landing-fade,
		.landing-ping {
			animation: none;
		}
	}
</style>
