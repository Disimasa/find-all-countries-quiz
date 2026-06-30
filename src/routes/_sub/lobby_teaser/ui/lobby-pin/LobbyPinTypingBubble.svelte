<script lang="ts">
	export let typedText = ''
	export let showCursor = false
</script>

<div class="typing-bubble">
	<div class="typing-line">
		<span class="typing-text">{typedText}</span>
		{#if showCursor}<span class="typing-cursor" aria-hidden="true"></span>{/if}
	</div>
	<span class="typing-tail" aria-hidden="true"></span>
</div>

<style>
	.typing-bubble {
		position: absolute;
		left: 50%;
		bottom: 34px;
		padding: 5px 9px 6px;
		border: 2.5px solid var(--color-base-100);
		border-radius: 11px;
		background: var(--color-base-100);
		box-shadow: 0 0 0 2px var(--color-primary);
		color: var(--color-primary);
		transform: translateX(-50%);
	}

	.typing-line {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		font-size: 11px;
		font-weight: 700;
		line-height: 1;
		white-space: nowrap;
	}

	.typing-text {
		display: inline-block;
	}

	.typing-cursor {
		display: inline-block;
		flex-shrink: 0;
		width: 2px;
		height: 11px;
		border-radius: 1px;
		background: var(--color-primary);
		transform: translateY(-0.5px);
		animation: typing-cursor-blink 0.85s step-end infinite;
	}

	.typing-tail {
		position: absolute;
		left: 50%;
		bottom: -7px;
		width: 0;
		height: 0;
		border-left: 7px solid transparent;
		border-right: 7px solid transparent;
		border-top: 8px solid var(--color-base-100);
		transform: translateX(-50%);
		filter: drop-shadow(0 2px 0 var(--color-primary));
	}

	@keyframes typing-cursor-blink {
		50% {
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.typing-cursor {
			animation: none;
		}
	}
</style>
