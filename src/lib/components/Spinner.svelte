<script lang="ts">
	// Reusable inline loading spinner. Inherits color from `currentColor`, so it
	// matches whatever text/button it sits inside.
	interface Props {
		size?: number;
		class?: string;
	}
	let { size = 16, class: klass = '' }: Props = $props();
</script>

<svg
	class="animate-spin shrink-0 {klass}"
	style="width: {size}px; height: {size}px;"
	viewBox="0 0 24 24"
	fill="none"
	aria-hidden="true"
>
	<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
	<path
		class="opacity-90"
		fill="currentColor"
		d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
	></path>
</svg>
