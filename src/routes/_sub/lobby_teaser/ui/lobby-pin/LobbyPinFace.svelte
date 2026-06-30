<script lang="ts">
	import IconCircleQuestion from '~icons/lucide/circle-question-mark'
	import type { LobbyPinMode } from '../../types.ts'

	export let mode: LobbyPinMode
	export let dotsText: string
</script>

{#if mode === 'question'}
	<div class="pin-icon" aria-hidden="true">
		<IconCircleQuestion />
	</div>
{:else if mode === 'thinking'}
	<div class="pin-emoji" aria-hidden="true">🤔</div>
{:else if mode === 'dots'}
	<div class="pin-dots" aria-hidden="true">{dotsText}</div>
{/if}

<style>
	.pin-icon {
		position: absolute;
		left: 50%;
		top: 18px;
		width: 22px;
		height: 22px;
		color: var(--color-base-100);
		transform: translate(-50%, -50%);
	}

	.pin-icon :global(svg) {
		display: block;
		width: 100%;
		height: 100%;
		stroke-width: 2.75;
	}

	.pin-icon :global(path) {
		stroke-width: 2.75;
	}

	.pin-icon :global(circle) {
		display: none;
	}

	.pin-emoji {
		position: absolute;
		left: 50%;
		top: 18px;
		font-size: 1.15rem;
		line-height: 1;
		transform: translate(-50%, -50%);
	}

	.pin-dots {
		position: absolute;
		left: 50%;
		top: 18px;
		min-width: 1.35rem;
		color: var(--color-base-100);
		font-size: 0.95rem;
		font-weight: 800;
		line-height: 1;
		letter-spacing: 0.04em;
		text-align: center;
		transform: translate(-50%, -50%);
	}
</style>
