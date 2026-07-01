<script lang="ts">
	import IconPlay from '~icons/lucide/play'

	export let label: string
	export let onStart: () => void
	function blockMapPointer(event: PointerEvent) {
		event.stopPropagation()
	}

	function handleStart(event: MouseEvent) {
		event.stopPropagation()
		event.preventDefault()
		onStart()
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="start-bubble" on:pointerdown={blockMapPointer} on:mousedown={blockMapPointer}>
	<button type="button" class="start-line" on:pointerdown={blockMapPointer} on:click={handleStart}>
		<IconPlay />
		<span class="start-label">{label}</span>
	</button>
	<span class="start-tail" aria-hidden="true"></span>
</div>

<style>
	.start-bubble {
		position: absolute;
		left: 50%;
		bottom: 34px;
		padding: 5px 14px 6px 10px;
		border: 2.5px solid var(--color-base-100);
		border-radius: 11px;
		background: var(--color-base-100);
		box-shadow: 0 0 0 2px var(--color-primary);
		transform: translateX(-50%);
		pointer-events: auto;
	}

	.start-line {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		border: none;
		background: transparent;
		padding: 0;
		margin: 0;
		min-height: 11px;
		color: var(--color-primary);
		font-size: 11px;
		font-weight: 700;
		line-height: 1;
		white-space: nowrap;
		cursor: pointer;
		transition: opacity 0.15s ease;
	}

	.start-line:hover {
		opacity: 0.82;
	}

	.start-line :global(svg) {
		display: block;
		flex-shrink: 0;
		width: 11px;
		height: 11px;
		fill: currentColor;
		stroke: none;
	}

	.start-label {
		display: inline-block;
		line-height: 1;
	}

	.start-tail {
		position: absolute;
		left: 50%;
		bottom: -7px;
		width: 0;
		height: 0;
		border-left: 7px solid transparent;
		border-right: 7px solid transparent;
		border-top: 8px solid var(--color-base-100);
		transform: translateX(-50%);
		filter: drop-shadow(0 2px 0 var(--color-primary));
	}
</style>
