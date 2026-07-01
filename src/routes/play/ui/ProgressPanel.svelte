<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import type { GameSnapshot, GeoEntity } from '@domain/entities'
	import { t } from '@i18n'
	import GuessDialog from './GuessDialog.svelte'
	import { formatTime } from '../controller'
	import IconCircleCheck from '~icons/lucide/circle-check'
	import IconMap from '~icons/lucide/map'
	import IconHeart from '~icons/lucide/heart'
	import IconCircleX from '~icons/lucide/circle-x'
	import IconTimer from '~icons/lucide/timer'
	import IconRotateCcw from '~icons/lucide/rotate-ccw'
	import IconLogOut from '~icons/lucide/log-out'
	import IconShuffle from '~icons/lucide/shuffle'

	export let snapshot: GameSnapshot
	export let canPickRandomCountry = false
	export let guessQuery = ''
	export let autocompleteResults: GeoEntity[] = []
	export let wrongPulse = 0

	const dispatch = createEventDispatcher<{
		reset: void
		end: void
		guessInput: string
		guessPick: string
		guessClose: void
		randomCountry: void
	}>()

	$: remaining = snapshot.progress.total - snapshot.progress.correct
	$: total = snapshot.progress.total
	$: correct = snapshot.progress.correct
	$: progressPercent = total > 0 ? Math.round((correct / total) * 100) : 0
	$: formattedTime = formatTime(snapshot.stats.timeRemaining)
	$: livesOrErrorsStat = snapshot.stats.livesEnabled
		? {
				key: 'lives' as const,
				label: $t('livesLabel'),
				value: `${snapshot.stats.lives}/${snapshot.stats.maxLives}`,
				icon: IconHeart,
				iconClass: 'text-rose-600',
				bgClass: 'bg-rose-500/10'
			}
		: {
				key: 'errors' as const,
				label: $t('errorsLabel'),
				value: String(snapshot.stats.wrongCount),
				icon: IconCircleX,
				iconClass: 'text-amber-600',
				bgClass: 'bg-amber-500/10'
			}

	$: stats = [
		{
			key: 'correct',
			label: $t('correct'),
			value: String(correct),
			icon: IconCircleCheck,
			iconClass: 'text-emerald-600',
			bgClass: 'bg-emerald-500/10'
		},
		{
			key: 'remaining',
			label: $t('remaining'),
			value: String(remaining),
			icon: IconMap,
			iconClass: 'text-violet-600',
			bgClass: 'bg-violet-500/10'
		},
		livesOrErrorsStat,
		{
			key: 'time',
			label: $t('time'),
			value: formattedTime,
			icon: IconTimer,
			iconClass: 'text-sky-600',
			bgClass: 'bg-sky-500/10'
		}
	] as const
</script>

<aside
	class="pointer-events-none absolute inset-0 z-1000 flex items-start justify-center p-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:items-stretch md:justify-end md:p-4 md:pr-5 md:pt-4"
>
	<div
		class="pointer-events-auto flex w-full max-w-70 flex-col gap-2 self-start rounded-2xl border border-base-300/80 bg-base-100 p-3 shadow-lg md:h-full md:min-h-0 md:gap-4 md:overflow-visible md:p-4 lg:max-w-72"
	>
		<div class="relative z-20 shrink-0">
			<GuessDialog
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

			{#if snapshot.status === 'playing'}
				<button
					type="button"
					data-testid="random-country"
					class="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium text-base-content/55 transition-colors hover:bg-base-200/80 hover:text-base-content disabled:pointer-events-none disabled:opacity-35"
					class:max-md:hidden={!!snapshot.selectedId}
					title={$t('randomCountryHint')}
					disabled={!canPickRandomCountry}
					on:click={() => dispatch('randomCountry')}
				>
					<IconShuffle class="size-3 shrink-0" />
					<span>{$t('randomCountry')}</span>
					<kbd
						class="hidden rounded border border-base-300/80 bg-base-200/70 px-1 py-px font-sans text-[9px] leading-none text-base-content/45 md:inline"
					>
						F2
					</kbd>
				</button>
			{/if}
		</div>

		<!-- Mobile: compact stats + exit (always visible while guessing) -->
		<div class="flex shrink-0 items-stretch gap-1 md:hidden">
			<div class="grid min-w-0 flex-1 grid-cols-4 gap-1">
				{#each stats as stat (stat.key)}
					<div
						class="flex flex-col items-center justify-center gap-px rounded-md border border-base-300/70 px-0.5 py-1 {stat.bgClass}"
						title="{stat.label}: {stat.value}"
					>
						<svelte:component this={stat.icon} class="size-3 shrink-0 {stat.iconClass}" />
						<span class="max-w-full truncate text-[10px] font-bold tabular-nums leading-none">
							{stat.value}
						</span>
					</div>
				{/each}
			</div>
			<button
				type="button"
				class="flex w-9 shrink-0 flex-col items-center justify-center rounded-md border border-base-300/70 bg-base-100 text-error hover:bg-error/10"
				title={$t('endQuiz')}
				aria-label={$t('endQuiz')}
				on:click={() => dispatch('end')}
			>
				<IconLogOut class="size-3.5" />
			</button>
		</div>

		<div class="hidden min-h-0 flex-1 md:block" aria-hidden="true"></div>

		<!-- Desktop: progress + stat cards -->
		<div class="hidden shrink-0 flex-col gap-3 md:flex">
			<div class="flex flex-col gap-1.5 p-1">
				<div class="flex items-baseline justify-between gap-2 text-xs">
					<span class="font-semibold text-xs">{$t('progress')}</span>
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

		<div class="mt-auto hidden shrink-0 gap-2 border-t border-base-300/70 pt-3 md:flex">
			<button
				type="button"
				class="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium text-base-content/65 hover:bg-base-200/80 hover:text-base-content"
				on:click={() => dispatch('reset')}
			>
				<IconRotateCcw class="size-3.5" />
				{$t('resetView')}
			</button>
			<button
				type="button"
				class="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium text-base-content/65 hover:bg-error/10 hover:text-error"
				on:click={() => dispatch('end')}
			>
				<IconLogOut class="size-3.5" />
				{$t('endQuiz')}
			</button>
		</div>
	</div>
</aside>
