<script lang="ts">
	import { onMount } from 'svelte'
	import { closeDialog } from 'svelte-awaitable-dialog'
	import type { GameConfig, GameSnapshot } from '@domain/entities'
	import { t } from '@i18n'
	import { buildGameConfig, clearSavedGame, loadGameSettings } from '@persist'
	import { formatTime, startGame } from '../controller'
	import { buildGameOverSummary } from '../game_over_summary'
	import { transitionToExplore, transitionToHome } from '../../map_shell'
	import ProgressDonut from './ProgressDonut.svelte'

	export let snapshot: GameSnapshot
	export let config: GameConfig
	export let victoryTitle: string
	export let gameOverTitle: string
	export let playAgainLabel: string
	export let exploreLinkLabel: string
	export let homeLabel: string

	let dialog: HTMLDialogElement

	$: summary = buildGameOverSummary(snapshot, config)
	$: won = snapshot.status === 'won'
	$: foundLabel = $t('gameOverFoundCount')
		.replace('{correct}', String(summary.correct))
		.replace('{total}', String(summary.total))
	$: mistakesLabel =
		summary.wrongCount === 0
			? $t('gameOverNoMistakes')
			: $t('gameOverMistakes').replace('{n}', String(summary.wrongCount))
	$: timeLabel = (() => {
		if (!summary.timerEnabled) return null
		if (won && summary.timeRemaining !== null) {
			return $t('gameOverTimeLeft').replace('{time}', formatTime(summary.timeRemaining))
		}
		if (summary.elapsedSeconds !== null) {
			return $t('gameOverTimeUsed').replace('{time}', formatTime(summary.elapsedSeconds))
		}
		return null
	})()
	$: lossLabel =
		summary.lossReason === 'time'
			? $t('gameOverLossTime')
			: summary.lossReason === 'lives'
				? $t('gameOverLossLives')
				: null
	$: timerChip = summary.timerEnabled
		? $t('minutesLabel').replace('{n}', String(Math.round(summary.timerSeconds / 60)))
		: $t('gameOverModeNoTimer')
	$: livesChip = summary.livesEnabled
		? `${summary.maxLives} ${$t('lives').toLowerCase()}`
		: $t('gameOverModeNoLives')

	onMount(() => {
		dialog?.showModal()
	})

	function goHome() {
		closeDialog()
		void transitionToHome()
	}

	function goExplore() {
		closeDialog()
		void transitionToExplore()
	}

	function playAgain() {
		closeDialog()
		clearSavedGame()
		void startGame(buildGameConfig(loadGameSettings()))
	}
</script>

<dialog
	bind:this={dialog}
	class="fixed top-1/2 left-1/2 m-0 w-[min(100vw-2rem,22rem)] -translate-x-1/2 -translate-y-1/2 border-0 bg-transparent p-0 shadow-none backdrop:bg-black/40"
>
	<div class="rounded-2xl border border-base-300/80 bg-base-100 p-6 text-center shadow-xl">
		<h2 class="text-xl font-bold text-base-content sm:text-2xl">
			{won ? victoryTitle : gameOverTitle}
		</h2>

		<div class="mt-4 flex justify-center">
			<ProgressDonut percent={summary.percent} />
		</div>

		<p class="mt-3 text-sm font-medium text-base-content">{foundLabel}</p>

		{#if lossLabel}
			<p class="mt-1 text-sm text-error/90">{lossLabel}</p>
		{/if}

		<p class="mt-2 text-xs text-base-content/60">
			{mistakesLabel}
			{#if timeLabel}
				<span aria-hidden="true"> · </span>
				{timeLabel}
			{/if}
		</p>

		<div class="mt-3 flex flex-wrap justify-center gap-1.5">
			<span class="rounded-full bg-base-200/80 px-2 py-0.5 text-[10px] font-medium text-base-content/65">
				{timerChip}
			</span>
			<span class="rounded-full bg-base-200/80 px-2 py-0.5 text-[10px] font-medium text-base-content/65">
				{livesChip}
			</span>
		</div>

		{#if !won}
			<button
				type="button"
				class="btn btn-link border-0 btn-sm mt-3 h-auto min-h-0 px-0 text-primary no-underline hover:underline"
				on:click={goExplore}
			>
				{exploreLinkLabel}
			</button>
		{/if}

		<div class="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
			<button type="button" class="btn btn-primary flex-1 rounded-xl sm:flex-none" on:click={playAgain}>
				{playAgainLabel}
			</button>
			<button
				type="button"
				class="btn btn-outline flex-1 rounded-xl border-primary/45 text-primary hover:border-primary hover:bg-primary/10 hover:text-primary sm:flex-none"
				on:click={goHome}
			>
				{homeLabel}
			</button>
		</div>
	</div>
</dialog>
