<script lang="ts">
	import { getFlagIconUrl } from './flag_icon_url.ts'

	interface Props {
		entityId: string
		flagCode?: string
		class?: string
	}

	let { entityId, flagCode, class: className = '' }: Props = $props()

	const src = $derived(getFlagIconUrl(entityId, flagCode))
</script>

{#if src}
	<img
		{src}
		alt=""
		aria-hidden="true"
		loading="lazy"
		decoding="async"
		class="inline-block h-3.5 w-[1.3125rem] shrink-0 rounded-[1.5px] object-cover shadow-[0_1px_1.5px_rgb(0_0_0/0.16),0_3px_7px_rgb(0_0_0/0.1)] {className}"
	/>
{:else}
	<span
		aria-hidden="true"
		class="inline-flex h-3.5 w-[1.3125rem] shrink-0 items-center justify-center rounded-[1.5px] bg-base-200 text-[0.5rem] leading-none text-base-content/45 shadow-[0_1px_1.5px_rgb(0_0_0/0.12),0_2px_5px_rgb(0_0_0/0.08)] {className}"
	>
		?
	</span>
{/if}
