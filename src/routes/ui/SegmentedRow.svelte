<script lang="ts">
	import { createEventDispatcher } from 'svelte'

	interface SegmentOption {
		key: string
		label: string
		active: boolean
		title?: string
	}

	export let ariaLabel: string
	export let disabled = false
	export let options: SegmentOption[]

	const dispatch = createEventDispatcher<{ select: string }>()

	$: activeIndex = options.findIndex((option) => option.active)
	$: segmentCount = options.length
</script>

<div
	class="relative flex w-full rounded-xl bg-base-300/45 p-1 ring-1 ring-base-300/50"
	role="group"
	aria-label={ariaLabel}
>
	{#if activeIndex >= 0}
		<div
			class="segment-thumb absolute top-1 bottom-1 rounded-lg bg-primary shadow-sm"
			style="--segments: {segmentCount}; --segment-index: {activeIndex}"
			aria-hidden="true"
		></div>
	{/if}

	{#each options as option (option.key)}
		<button
			type="button"
			class="segment-option relative z-10 min-w-0 flex-1 rounded-lg px-1.5 py-1.5 text-xs font-semibold tabular-nums transition-colors duration-200 {option.active
				? 'text-primary-content'
				: 'text-base-content/70 hover:text-base-content'}"
			title={option.title}
			{disabled}
			on:click={() => dispatch('select', option.key)}
		>
			{option.label}
		</button>
	{/each}
</div>

<style>
	.segment-thumb {
		width: calc((100% - 0.5rem) / var(--segments));
		left: calc(0.25rem + var(--segment-index) * ((100% - 0.5rem) / var(--segments)));
		transition:
			left 0.32s cubic-bezier(0.34, 1.15, 0.64, 1),
			width 0.32s cubic-bezier(0.34, 1.15, 0.64, 1);
	}

	@media (prefers-reduced-motion: reduce) {
		.segment-thumb {
			transition: none;
		}

		.segment-option {
			transition: none;
		}
	}
</style>
