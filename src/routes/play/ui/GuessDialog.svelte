<script lang="ts">
	import { createEventDispatcher, tick } from 'svelte'
	import type { GeoEntity, Locale } from '@domain/entities'
	import { t } from '@i18n'
	import FlagIcon from '@shared/FlagIcon.svelte'
	import IconSearch from '~icons/lucide/search'
	import IconX from '~icons/lucide/x'
	import IconMapPin from '~icons/lucide/map-pin'

	export let placeholder = ''
	export let inactiveHint = ''
	export let results: GeoEntity[] = []
	export let query = ''
	export let locale: Locale
	export let wrongPulse = 0
	export let active = false
	export let selectedId: string | null = null

	let wrongShake = false
	let inputEl: HTMLInputElement
	let listId = `guess-list-${Math.random().toString(36).slice(2, 9)}`
	let focusedSelectionId: string | null = null
	let highlightIndex = -1
	let optionEls: (HTMLButtonElement | undefined)[] = []

	const dispatch = createEventDispatcher<{
		input: string
		pick: string
		close: void
	}>()

	function onInput(event: Event) {
		const value = (event.target as HTMLInputElement).value
		query = value
		highlightIndex = -1
		dispatch('input', value)
	}

	function pickAt(index: number) {
		const entity = results[index]
		if (entity) dispatch('pick', entity.id)
	}

	function moveHighlight(delta: number) {
		if (results.length === 0) return
		if (highlightIndex < 0) {
			highlightIndex = delta > 0 ? 0 : results.length - 1
		} else {
			highlightIndex = (highlightIndex + delta + results.length) % results.length
		}
		void tick().then(() => {
			optionEls[highlightIndex]?.scrollIntoView({ block: 'nearest' })
		})
	}

	function onKeydown(event: KeyboardEvent) {
		if (results.length === 0) {
			if (event.key === 'Enter') event.preventDefault()
			return
		}

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault()
				moveHighlight(1)
				break
			case 'ArrowUp':
				event.preventDefault()
				moveHighlight(-1)
				break
			case 'Tab':
				event.preventDefault()
				moveHighlight(event.shiftKey ? -1 : 1)
				break
			case 'Enter':
				event.preventDefault()
				pickAt(highlightIndex >= 0 ? highlightIndex : 0)
				break
			case 'Escape':
				highlightIndex = -1
				break
		}
	}

	$: if (wrongPulse > 0) {
		wrongShake = false
		requestAnimationFrame(() => {
			wrongShake = true
		})
	}

	$: if (selectedId && selectedId !== focusedSelectionId) {
		focusedSelectionId = selectedId
		highlightIndex = -1
		void tick().then(() => {
			requestAnimationFrame(() => {
				requestAnimationFrame(() => inputEl?.focus())
			})
		})
	}

	$: if (!selectedId) focusedSelectionId = null

	$: resolvedPlaceholder = placeholder || $t('guessPlaceholder')
	$: resolvedInactiveHint = inactiveHint || $t('selectCountryHint')
	$: optionEls.length = results.length
</script>

<div
	class="shrink-0"
	class:animate-[wrong-shake_0.42s_ease]={wrongShake}
	on:animationend={() => (wrongShake = false)}
>
	{#if !active}
		<div
			class="flex items-center gap-2 rounded-xl border border-base-300 bg-base-100 px-3 py-2 text-sm text-base-content/55"
		>
			<IconMapPin class="size-4 shrink-0 text-primary/70" />
			<span>{resolvedInactiveHint}</span>
		</div>
	{:else}
		<div class="relative z-30">
			<label
				class="flex w-full items-center gap-2 rounded-xl border border-base-300 bg-base-100 px-3 py-2.5 focus-within:border-base-content/30"
			>
				<IconSearch class="size-4 shrink-0 text-base-content/40" />
				<input
					bind:this={inputEl}
					type="text"
					role="combobox"
					aria-expanded={results.length > 0}
					aria-controls={listId}
					aria-activedescendant={highlightIndex >= 0 ? `${listId}-opt-${highlightIndex}` : undefined}
					autocomplete="off"
					class="min-w-0 grow bg-transparent text-sm outline-none"
					placeholder={resolvedPlaceholder}
					value={query}
					on:input={onInput}
					on:keydown={onKeydown}
				/>
				<button
					type="button"
					class="shrink-0 rounded-full p-0.5 text-base-content/40 hover:bg-base-200 hover:text-base-content"
					aria-label={$t('closeLabel')}
					on:click={() => dispatch('close')}
				>
					<IconX class="size-4" />
				</button>
			</label>

			<ul
				id={listId}
				role="listbox"
				class="absolute inset-x-0 top-[calc(100%+0.375rem)] z-40 flex max-h-56 flex-col gap-0.5 overflow-y-auto rounded-xl border border-base-300 bg-base-100 p-1 shadow-lg"
				class:hidden={results.length === 0}
			>
				{#each results as entity, index (entity.id)}
					<li role="presentation">
						<button
							id="{listId}-opt-{index}"
							bind:this={optionEls[index]}
							type="button"
							role="option"
							aria-selected={highlightIndex === index}
							class="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-primary/10 {highlightIndex === index ? 'bg-primary/15 ring-1 ring-primary/25' : ''}"
							on:mousedown|preventDefault
							on:mouseenter={() => (highlightIndex = index)}
							on:click={() => dispatch('pick', entity.id)}
						>
							<FlagIcon entityId={entity.id} flagCode={entity.flagCode} />
							<span class="min-w-0 truncate">{entity.names[locale]}</span>
						</button>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
