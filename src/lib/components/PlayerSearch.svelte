<script lang="ts">
	import Spinner from './Spinner.svelte';

	interface Player {
		governor_id: number;
		governor_name: string;
		power: number;
	}

	interface Props {
		onselect: (player: Player) => void;
		placeholder?: string;
	}

	let { onselect, placeholder = 'Tên hoặc ID...' }: Props = $props();

	let query = $state('');
	let results = $state<Player[]>([]);
	let loading = $state(false);
	let open = $state(false);
	let timer: ReturnType<typeof setTimeout>;

	function onInput() {
		clearTimeout(timer);
		if (query.length < 2) { results = []; open = false; return; }
		timer = setTimeout(doSearch, 250);
	}

	async function doSearch() {
		loading = true;
		try {
			const res = await fetch(`/api/players/kingdom-search?q=${encodeURIComponent(query)}`);
			results = await res.json();
			open = results.length > 0;
		} finally {
			loading = false;
		}
	}

	function pick(p: Player) {
		query = `${p.governor_name} · ${p.governor_id}`;
		results = [];
		open = false;
		onselect(p);
	}

	function onFocus() {
		if (query) { query = ''; }
	}

	function onBlur() {
		setTimeout(() => { open = false; }, 150);
	}
</script>

<div class="relative">
	<div class="relative">
		<input
			type="text"
			class="input w-full pr-7"
			{placeholder}
			bind:value={query}
			oninput={onInput}
			onfocus={onFocus}
			onblur={onBlur}
			autocomplete="off"
		/>
		{#if loading}
			<span class="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
				<Spinner size={14} />
			</span>
		{/if}
	</div>

	{#if open}
		<ul class="absolute z-20 top-full mt-1 w-full bg-rok-surface border border-rok-border rounded-lg shadow-lg overflow-hidden">
			{#each results as p}
				<li>
					<button
						type="button"
						class="w-full text-left px-3 py-2 text-sm hover:bg-rok-accent/10 flex items-center justify-between gap-2"
						onmousedown={() => pick(p)}
					>
						<span class="text-rok-text truncate">{p.governor_name}</span>
						<span class="text-rok-dim shrink-0 text-xs">{p.governor_id}</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
