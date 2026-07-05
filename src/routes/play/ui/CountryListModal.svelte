<script lang="ts">
	import { onMount } from 'svelte'
	import { closeDialog, resolveDialog } from 'svelte-awaitable-dialog'
	import type { GeoEntity, Locale } from '@domain/entities'
	import FlagIcon from '@shared/FlagIcon.svelte'
	import IconX from '~icons/lucide/x'

	export let entities: GeoEntity[] = []
	export let locale: Locale = 'en'
	export let guessedIds: string[] = []
	export let eraId = 'modern'
	export let title = ''
	export let closeLabel = ''

	let dialog: HTMLDialogElement
	const guessedSet = new Set(guessedIds)

	onMount(() => {
		dialog?.showModal()
	})

	function pick(entityId: string) {
		if (!guessedSet.has(entityId)) return
		resolveDialog(entityId)
	}

	function dismiss() {
		closeDialog()
	}
</script>

<dialog
	bind:this={dialog}
	data-testid="country-list-modal"
	class="fixed top-1/2 left-1/2 m-0 w-[min(100vw-1.5rem,24rem)] -translate-x-1/2 -translate-y-1/2 border-0 bg-transparent p-0 shadow-none backdrop:bg-black/40"
	on:close={dismiss}
>
	<div class="flex max-h-[min(80dvh,32rem)] flex-col overflow-hidden rounded-2xl border border-base-300/80 bg-base-100 shadow-xl">
		<div class="flex shrink-0 items-center justify-between gap-2 border-b border-base-300/70 px-4 py-3">
			<h2 class="text-sm font-semibold text-base-content">{title}</h2>
			<button
				type="button"
				class="rounded-lg p-1 text-base-content/55 hover:bg-base-200/80 hover:text-base-content"
				aria-label={closeLabel}
				on:click={dismiss}
			>
				<IconX class="size-4" />
			</button>
		</div>

		<ul class="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-2">
			{#each entities as entity (entity.id)}
				{@const guessed = guessedSet.has(entity.id)}
				<li>
					{#if guessed}
						<button
							type="button"
							data-testid="country-list-item-{entity.id}"
							class="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left text-sm text-base-content/70 transition-colors hover:bg-primary/10"
							on:click={() => pick(entity.id)}
						>
							<FlagIcon
								entityId={entity.id}
								flagCode={entity.flagCode}
								flagAsset={entity.flagAsset}
								{eraId}
								size="lg"
							/>
							<span class="min-w-0 flex-1 truncate line-through">
								{entity.names[locale]}
							</span>
						</button>
					{:else}
						<div
							data-testid="country-list-item-{entity.id}"
							class="flex w-full cursor-default items-center gap-3 rounded-lg px-2.5 py-2.5 text-left text-sm text-base-content"
						>
							<FlagIcon
								entityId={entity.id}
								flagCode={entity.flagCode}
								flagAsset={entity.flagAsset}
								{eraId}
								size="lg"
							/>
							<span class="min-w-0 flex-1 truncate">
								{entity.names[locale]}
							</span>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	</div>
</dialog>
