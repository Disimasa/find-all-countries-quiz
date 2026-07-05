<script lang="ts">
	import { onMount } from 'svelte'
	import { closeDialog } from 'svelte-awaitable-dialog'
	import type { GameConfig, GameSnapshot } from '@domain/entities'
	import { t } from '@i18n'
	import { clearSavedGame } from '@persist'
	import { formatTime, startGame } from '../controller'
	import { buildGameOverSummary } from '../game_over_summary'
	import { formatGameRulesLine } from '../game_over_rules.ts'
	import { buildLobbyShareUrl, copyShareLink } from '../share_game_link.ts'
	import { transitionToExplore, transitionToHome } from '../../map_shell'
	import ProgressDonut from './ProgressDonut.svelte'
	import IconShare2 from '~icons/lucide/share-2'
	import IconPlay from '~icons/lucide/play'
	import IconMap from '~icons/lucide/map'
	import IconCircleX from '~icons/lucide/circle-x'
	import IconTimer from '~icons/lucide/timer'

	export let snapshot: GameSnapshot
	export let config: GameConfig
	export let victoryTitle: string
	export let gameOverTitle: string
	export let playAgainLabel: string
	export let exploreLinkLabel: string
	export let homeLabel: string
	export let ended = false
	export let endedTitle = ''
	export let eraId = 'modern'
	export let shareLabel: string
	export let shareCopiedLabel: string

	let dialog: HTMLDialogElement
	let shareCopied = false
	let shareResetTimer: ReturnType<typeof setTimeout> | undefined

	$: summary = buildGameOverSummary(snapshot, config)
	$: won = snapshot.status === 'won'
	$: title = ended ? endedTitle : won ? victoryTitle : gameOverTitle
	$: foundLabel = $t('gameOverFoundCount')
		.replace('{correct}', String(summary.correct))
		.replace('{total}', String(summary.total))
	$: rulesLine = formatGameRulesLine(eraId, config, $t)
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
	$: timeLine = timeLabel ?? $t('gameOverModeNoTimer')
	$: mistakesIconClass =
		summary.wrongCount === 0 ? 'text-emerald-600' : 'text-amber-600'

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
		clearSavedGame(eraId)
		void startGame(config)
	}

	async function shareChallenge() {
		const url = buildLobbyShareUrl(window.location.origin, eraId, config)
		const copied = await copyShareLink(url)
		if (!copied) {
			window.prompt(url)
			return
		}

		shareCopied = true
		if (shareResetTimer) clearTimeout(shareResetTimer)
		shareResetTimer = setTimeout(() => {
			shareCopied = false
		}, 2000)
	}
</script>

<dialog
	bind:this={dialog}
	data-testid="game-over-modal"
	data-outcome={ended ? 'ended' : snapshot.status}
	class="fixed top-1/2 left-1/2 m-0 w-[min(100vw-2rem,22rem)] -translate-x-1/2 -translate-y-1/2 border-0 bg-transparent p-0 shadow-none backdrop:bg-black/40"
>
	<div class="rounded-2xl border border-base-300/80 bg-base-100 p-6 text-center shadow-xl">
		<h2
			data-testid="game-over-title"
			class="text-xl font-bold text-base-content sm:text-2xl mb-4"
		>
			{title}
		</h2>

		<div class="mt-4 border-t border-base-300/70 pt-4">
			<div class="flex items-center justify-center gap-4">
				<ProgressDonut percent={summary.percent} />
				<div class="flex h-32 min-w-0 flex-col justify-center gap-5 text-left">
					<div class="flex items-center gap-2">
						<IconMap class="size-3.5 shrink-0 text-violet-600" />
						<p class="text-sm font-medium leading-tight text-base-content">{foundLabel}</p>
					</div>
					<div class="flex items-center gap-2">
						<IconCircleX class="size-3.5 shrink-0 {mistakesIconClass}" />
						<p class="text-xs leading-tight text-base-content/70">{mistakesLabel}</p>
					</div>
					<div class="flex items-center gap-2">
						<IconTimer
							class="size-3.5 shrink-0 {summary.timerEnabled ? 'text-sky-600' : 'text-base-content/40'}"
						/>
						<p class="text-xs leading-tight text-base-content/60">{timeLine}</p>
					</div>
				</div>
			</div>
		</div>

		<div class="mt-4 border-t border-base-300/70 pt-4">
			<p class="text-xs leading-snug text-base-content/55">{rulesLine}</p>

			<button
				type="button"
				data-testid="share-game-over"
				class="mt-4 flex w-full items-center gap-3 rounded-xl border border-dashed border-base-300/80 bg-base-200/30 px-3 py-2.5 text-left transition-[border-color,background-color] hover:border-primary/30 hover:bg-primary/5"
				on:click={shareChallenge}
			>
				<span
					class="flex size-8 shrink-0 items-center justify-center rounded-full bg-base-100 text-primary shadow-sm"
				>
					<IconShare2 class="size-4" />
				</span>
				<span class="min-w-0 flex-1">
					<span class="block text-sm font-medium leading-tight text-base-content">
						{shareCopied ? shareCopiedLabel : shareLabel}
					</span>
				</span>
			</button>

			<div class="mt-5 flex gap-2">
				<button
					type="button"
					class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-content shadow-sm ring-1 ring-primary/25 transition-[background-color,box-shadow,transform] hover:bg-primary/90 hover:shadow-md active:scale-[0.98]"
					on:click={playAgain}
				>
					<IconPlay class="size-4" />
					{playAgainLabel}
				</button>
				<button
					type="button"
					class="flex flex-1 items-center justify-center rounded-xl px-3 py-2.5 text-sm font-medium text-base-content/65 hover:bg-base-200/80 hover:text-base-content"
					on:click={goHome}
				>
					{homeLabel}
				</button>
			</div>

			{#if !won}
				<button
					type="button"
					class="mt-3 bg-transparent p-0 text-xs font-normal text-primary/75 underline-offset-2 hover:text-primary hover:underline focus:outline-none"
					on:click={goExplore}
				>
					{exploreLinkLabel}
				</button>
			{/if}
		</div>
	</div>
</dialog>
