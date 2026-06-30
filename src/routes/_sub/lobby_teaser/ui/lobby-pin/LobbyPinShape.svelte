<script lang="ts">
	export let className = ''
</script>

<svg
	class="pin {className}"
	width="38"
	height="46"
	viewBox="0 0 48 56"
	aria-hidden="true"
	xmlns="http://www.w3.org/2000/svg"
>
	<path
		class="pin-shape"
		d="M24 3.5
		   C13.8 3.5 5.5 12.1 5.5 22.4
		   C5.5 35.8 24 54.5 24 54.5
		   C24 54.5 42.5 35.8 42.5 22.4
		   C42.5 12.1 34.2 3.5 24 3.5 Z"
	/>
</svg>

<style>
	.pin {
		display: block;
		overflow: visible;
	}

	.pin-shape {
		fill: var(--color-primary);
		stroke: var(--color-base-100);
		stroke-width: 3.5;
		paint-order: stroke fill;
	}
</style>
