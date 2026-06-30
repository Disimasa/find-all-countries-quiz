<script lang="ts">
	import type { LobbyPinMode } from '../../types.ts'
	import type { PinPhase } from './constants.ts'
	import LobbyPinFace from './LobbyPinFace.svelte'
	import LobbyPinShape from './LobbyPinShape.svelte'
	import LobbyPinTypingBubble from './LobbyPinTypingBubble.svelte'

	export let mode: LobbyPinMode
	export let phase: PinPhase
	export let typedText: string
	export let dotsText: string
	export let showCursor: boolean
	export let bodyEl: HTMLDivElement | undefined = undefined
</script>

<div class="host">
	<div
		bind:this={bodyEl}
		class="body"
		class:body--typing={mode === 'typing'}
		class:body--entering={phase === 'entering'}
		class:body--leaving={phase === 'leaving'}
	>
		{#if mode === 'typing'}
			<LobbyPinTypingBubble {typedText} {showCursor} />
		{/if}

		<LobbyPinShape />
		<LobbyPinFace {mode} {dotsText} />
	</div>
</div>

<style>
	.host {
		pointer-events: none;
		line-height: 0;
	}

	.body {
		position: relative;
		width: 38px;
		height: 46px;
		transform-origin: 50% 100%;
		filter: drop-shadow(0 5px 14px rgb(0 0 0 / 0.24));
	}

	.body--typing {
		width: max-content;
		min-width: 38px;
	}

	.body--entering {
		animation: bubble-in 0.48s cubic-bezier(0.34, 1.48, 0.64, 1) both;
	}

	.body--leaving {
		animation: bubble-out 0.3s cubic-bezier(0.45, 0, 0.75, 0.15) both;
	}

	@keyframes bubble-in {
		0% {
			opacity: 0;
			transform: scale(0.28) translateY(14px);
		}

		55% {
			opacity: 1;
			transform: scale(1.07) translateY(-3px);
		}

		100% {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	@keyframes bubble-out {
		0% {
			opacity: 1;
			transform: scale(1) translateY(0);
		}

		100% {
			opacity: 0;
			transform: scale(0.32) translateY(12px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.body--entering,
		.body--leaving {
			animation: none;
		}
	}
</style>
