<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import type { Locale } from '@domain/entities'
	import IconChevronDown from '~icons/lucide/chevron-down'
	import { buildLocaleSegmentOptions } from './game_settings_model.ts'

	export let ariaLabel: string
	export let disabled = false
	export let currentLocale: Locale

	let open = false

	const dispatch = createEventDispatcher<{ select: Locale }>()

	$: options = buildLocaleSegmentOptions(currentLocale)
	$: currentLabel = options.find((option) => option.active)?.label ?? currentLocale.toUpperCase()

	function toggle() {
		if (disabled) return
		open = !open
	}

	function select(locale: Locale) {
		dispatch('select', locale)
		open = false
	}

	function clickOutside(node: HTMLElement) {
		const handle = (event: PointerEvent) => {
			if (!open) return
			if (!node.contains(event.target as Node)) open = false
		}

		document.addEventListener('pointerdown', handle)
		return {
			destroy() {
				document.removeEventListener('pointerdown', handle)
			}
		}
	}
</script>

<div class="relative shrink-0" use:clickOutside>
	<button
		type="button"
		data-testid="locale-picker-trigger"
		class="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold tabular-nums text-base-content/65 transition-colors hover:bg-base-200/80 hover:text-base-content disabled:pointer-events-none disabled:opacity-40"
		aria-label={ariaLabel}
		aria-haspopup="listbox"
		aria-expanded={open}
		{disabled}
		on:click|stopPropagation={toggle}
	>
		{currentLabel}
		<IconChevronDown
			class="size-3 shrink-0 transition-transform duration-200 {open ? 'rotate-180' : ''}"
		/>
	</button>

	{#if open}
		<div
			class="absolute top-[calc(100%+0.25rem)] right-0 z-20 min-w-[4.5rem] overflow-hidden rounded-lg border border-base-300/80 bg-base-100 py-1 shadow-lg"
			role="listbox"
			aria-label={ariaLabel}
		>
			{#each options as option (option.key)}
				<button
					type="button"
					role="option"
					data-testid="locale-option-{option.key}"
					aria-selected={option.active}
					class="block w-full px-3 py-1.5 text-left text-xs font-semibold tabular-nums transition-colors {option.active
						? 'bg-primary/10 text-primary'
						: 'text-base-content/75 hover:bg-base-200/80 hover:text-base-content'}"
					on:click={() => select(option.key as Locale)}
				>
					{option.label}
				</button>
			{/each}
		</div>
	{/if}
</div>
