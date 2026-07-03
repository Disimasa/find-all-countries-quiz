<script lang="ts">
	import { MODERN_ERA_ID } from '@domain/maps'
	import { getFlagIconUrl } from './flag_icon_url.ts'

	export let entityId: string
	export let flagCode: string | undefined = undefined
	export let flagAsset: string | undefined = undefined
	export let eraId: string = MODERN_ERA_ID
	export let className = ''

	$: src = getFlagIconUrl({ eraId, entityId, flagCode, flagAsset })
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
{/if}
