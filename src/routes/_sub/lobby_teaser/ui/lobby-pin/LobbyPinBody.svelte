<script lang="ts">
	import type { LobbyPinMode } from '../../types.ts'
	import type { PinPhase } from './constants.ts'
	import LobbyPinFace from './LobbyPinFace.svelte'
	import LobbyPinShape from './LobbyPinShape.svelte'
	import LobbyPinTypingBubble from './LobbyPinTypingBubble.svelte'
	import LobbyPinStartBubble from './LobbyPinStartBubble.svelte'
	import { lobbyPinStartCta } from '../../lobby_pin_start.ts'

	export let mode: LobbyPinMode
	export let phase: PinPhase
	export let typedText: string
	export let dotsText: string
	export let showCursor: boolean
	export let pinAnimEl: HTMLDivElement | undefined = undefined
</script>

<div class="host">
	<div class="body">
		<div
			bind:this={pinAnimEl}
			class="pin-anim"
			class:pin-anim--start={mode === 'start'}
			class:pin-anim--typing={mode === 'typing'}
			class:pin-anim--entering={phase === 'entering'}
			class:pin-anim--leaving={phase === 'leaving'}
			class:pin-anim--visible={phase === 'visible'}
		>
			{#if mode === 'typing'}
				<LobbyPinTypingBubble {typedText} {showCursor} />
			{:else if mode === 'start' && $lobbyPinStartCta}
				<LobbyPinStartBubble
					label={$lobbyPinStartCta.label}
					onStart={$lobbyPinStartCta.onStart}
				/>
			{/if}

			<div class="pin-core">
				<LobbyPinShape />
				<LobbyPinFace {mode} {dotsText} />
			</div>
		</div>
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
	}

	.pin-anim {
		position: relative;
		width: 38px;
		height: 46px;
		transform-origin: 50% 100%;
		filter: drop-shadow(0 5px 14px rgb(0 0 0 / 0.24));
		opacity: 0;
		visibility: hidden;
	}

	.pin-anim--start,
	.pin-anim--typing {
		width: max-content;
		min-width: 38px;
	}

	.pin-anim--start.pin-anim--entering {
		animation: bubble-in-start 0.26s cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	.pin-anim--start.pin-anim--leaving {
		animation: bubble-out-start 0.16s cubic-bezier(0.4, 0, 0.7, 0.2) both;
	}

	.pin-anim--entering {
		visibility: visible;
		animation: bubble-in 0.48s cubic-bezier(0.34, 1.48, 0.64, 1) both;
	}

	.pin-anim--leaving {
		visibility: visible;
		animation: bubble-out 0.3s cubic-bezier(0.45, 0, 0.75, 0.15) both;
	}

	.pin-anim--visible {
		opacity: 1;
		visibility: visible;
		transform: scale(1) translateY(0);
	}

	.pin-core {
		position: relative;
		width: 38px;
		height: 46px;
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

	@keyframes bubble-in-start {
		0% {
			opacity: 0;
			transform: scale(0.84) translateY(7px);
		}

		100% {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	@keyframes bubble-out-start {
		0% {
			opacity: 1;
			transform: scale(1) translateY(0);
		}

		100% {
			opacity: 0;
			transform: scale(0.9) translateY(5px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.pin-anim--entering,
		.pin-anim--leaving {
			animation: none;
		}

		.pin-anim--visible {
			opacity: 1;
		}
	}
</style>
