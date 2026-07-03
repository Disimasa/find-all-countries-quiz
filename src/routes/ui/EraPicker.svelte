<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import type { EraPickerOption } from './game_settings_model.ts'
	import IconCheck from '~icons/lucide/check'

	export let ariaLabel: string
	export let disabled = false
	export let options: EraPickerOption[] = []

	const dispatch = createEventDispatcher<{ select: string }>()

	function formatYear(year: number | null): string | null {
		if (year === null) return null
		if (year < 0) return `${Math.abs(year)} BCE`
		if (year < 1000) return `${year} AD`
		return String(year)
	}

	function showYearBadge(option: EraPickerOption): boolean {
		const formatted = formatYear(option.year)
		if (!formatted) return false
		if (option.label === formatted) return false
		if (option.year !== null && option.label.includes(String(option.year))) return false
		return true
	}
</script>

<div
	class="era-picker flex max-h-52 flex-col gap-1.5 overflow-y-auto overscroll-y-contain pr-0.5"
	role="listbox"
	aria-label={ariaLabel}
>
	{#each options as option (option.id)}
		<button
			type="button"
			role="option"
			data-testid="era-option-{option.id}"
			aria-selected={option.active}
			class="era-option group flex w-full items-start gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-[border-color,background-color,box-shadow,transform] duration-200 {option.active
				? 'border-primary/55 bg-primary/10 shadow-sm ring-1 ring-primary/25'
				: 'border-base-300/70 bg-base-100/60 hover:border-base-content/20 hover:bg-base-200/50'}"
			class:opacity-50={disabled}
			class:pointer-events-none={disabled}
			{disabled}
			on:click={() => dispatch('select', option.id)}
		>
			<span
				class="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors {option.active
					? 'border-primary bg-primary text-primary-content'
					: 'border-base-content/25 bg-base-100/80 text-transparent group-hover:border-base-content/35'}"
				aria-hidden="true"
			>
				<IconCheck class="size-2.5" />
			</span>

			<span class="min-w-0 flex-1">
				<span class="flex items-baseline justify-between gap-2">
					<span
						class="truncate text-sm font-semibold leading-tight {option.active
							? 'text-primary'
							: 'text-base-content'}"
					>
						{option.label}
					</span>
					{#if showYearBadge(option)}
						<span
							class="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums leading-none {option.active
								? 'bg-primary/15 text-primary'
								: 'bg-base-300/55 text-base-content/55'}"
						>
							{formatYear(option.year)}
						</span>
					{/if}
				</span>
				{#if option.hint}
					<span class="mt-0.5 block text-[11px] leading-snug text-base-content/55">{option.hint}</span>
				{/if}
			</span>
		</button>
	{/each}
</div>

<style>
	.era-picker {
		scrollbar-width: thin;
		scrollbar-color: color-mix(in oklch, var(--color-base-content) 22%, transparent) transparent;
	}

	.era-picker::-webkit-scrollbar {
		width: 5px;
	}

	.era-picker::-webkit-scrollbar-thumb {
		border-radius: 9999px;
		background: color-mix(in oklch, var(--color-base-content) 22%, transparent);
	}
</style>
