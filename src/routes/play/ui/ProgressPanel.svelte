<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import type { GameSnapshot, GeoEntity } from '@domain/entities'
	import GuessDialog from './GuessDialog.svelte'
	import IconCircleCheck from '~icons/lucide/circle-check'
	import IconMap from '~icons/lucide/map'
	import IconHeart from '~icons/lucide/heart'
	import IconTimer from '~icons/lucide/timer'
	import IconRotateCcw from '~icons/lucide/rotate-ccw'
	import IconLogOut from '~icons/lucide/log-out'

	export let snapshot: GameSnapshot
	export let correctLabel: string
	export let remainingLabel: string
	export let livesLabel: string
	export let timeLabel: string
	export let progressLabel: string
	export let formattedTime: string
	export let resetLabel: string
	export let endLabel: string
	export let guessPlaceholder: string
	export let selectCountryHint: string
	export let guessQuery = ''
	export let autocompleteResults: GeoEntity[] = []
	export let wrongPulse = 0

	const dispatch = createEventDispatcher<{
		reset: void
		end: void
		guessInput: string
		guessPick: string
		guessClose: void
	}>()

	$: remaining = snapshot.progress.total - snapshot.progress.correct
	$: total = snapshot.progress.total
	$: correct = snapshot.progress.correct
	$: progressPercent = total > 0 ? Math.round((correct / total) * 100) : 0

	$: stats = [
		{
			key: 'correct',
			label: correctLabel,
			value: String(correct),
			icon: IconCircleCheck,
			iconClass: 'text-emerald-600',
			bgClass: 'bg-emerald-500/10'
		},
		{
			key: 'remaining',
			label: remainingLabel,
			value: String(remaining),
			icon: IconMap,
			iconClass: 'text-violet-600',
			bgClass: 'bg-violet-500/10'
		},
		{
			key: 'lives',
			label: livesLabel,
			value: String(snapshot.lives),
			icon: IconHeart,
			iconClass: 'text-rose-600',
			bgClass: 'bg-rose-500/10'
		},
		{
			key: 'time',
			label: timeLabel,
			value: formattedTime,
			icon: IconTimer,
			iconClass: 'text-sky-600',
			bgClass: 'bg-sky-500/10'
		}
	] as const
</script>

<aside
	class="pointer-events-none absolute inset-0 z-1000 flex items-stretch justify-center p-3 md:justify-end md:p-4 md:pr-5"
>
	<div
		class="pointer-events-auto flex h-full min-h-0 w-full max-w-70 flex-col gap-4 overflow-visible rounded-2xl border border-base-300/80 bg-base-100 p-4 shadow-lg lg:max-w-72"
	>
		<div class="relative z-20 shrink-0">
			<GuessDialog
				placeholder={guessPlaceholder}
				inactiveHint={selectCountryHint}
				results={autocompleteResults}
				query={guessQuery}
				locale={snapshot.locale}
				{wrongPulse}
				active={!!snapshot.selectedId}
				selectedId={snapshot.selectedId}
				on:input={(e) => dispatch('guessInput', e.detail)}
				on:pick={(e) => dispatch('guessPick', e.detail)}
				on:close={() => dispatch('guessClose')}
			/>
		</div>

		<div class="min-h-0 flex-1" aria-hidden="true"></div>

		<div class="flex shrink-0 flex-col gap-3">
			<div class="flex flex-col gap-1.5 p-1">
				<div class="flex items-baseline justify-between gap-2 text-xs">
					<span class="font-semibold text-xs">{progressLabel}</span>
					<span class="font-semibold tabular-nums text-emerald-500">{progressPercent}%</span>
				</div>
				<div
					class="h-1 overflow-hidden rounded-full bg-base-300/80"
					role="progressbar"
					aria-valuenow={progressPercent}
					aria-valuemin={0}
					aria-valuemax={100}
				>
					<div
						class="h-full rounded-full bg-linear-to-r from-emerald-400 to-emerald-500 transition-[width] duration-300 ease-out"
						style:width="{progressPercent}%"
					></div>
				</div>
			</div>

			<div class="grid grid-cols-2 gap-2">
				{#each stats as stat (stat.key)}
					<div
						class="flex flex-col items-center gap-1 rounded-xl border border-base-300/70 px-2 py-3 text-center {stat.bgClass}"
					>
						<div class="flex size-8 items-center justify-center rounded-full bg-base-100/75">
							<svelte:component this={stat.icon} class="size-4.5 {stat.iconClass}" />
						</div>
						<span class="text-lg font-bold tabular-nums leading-tight">{stat.value}</span>
						<span class="text-xs leading-tight text-base-content/70">{stat.label}</span>
					</div>
				{/each}
			</div>
		</div>

		<div class="mt-auto flex shrink-0 gap-2 border-t border-base-300/70 pt-3">
			<button
				type="button"
				class="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium text-base-content/65 hover:bg-base-200/80 hover:text-base-content"
				on:click={() => dispatch('reset')}
			>
				<IconRotateCcw class="size-3.5" />
				{resetLabel}
			</button>
			<button
				type="button"
				class="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium text-base-content/65 hover:bg-error/10 hover:text-error"
				on:click={() => dispatch('end')}
			>
				<IconLogOut class="size-3.5" />
				{endLabel}
			</button>
		</div>
	</div>
</aside>
