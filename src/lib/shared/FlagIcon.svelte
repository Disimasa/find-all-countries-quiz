<script lang="ts">
	import { MODERN_ERA_ID } from '@domain/maps'
	import { getFlagIconUrl } from './flag_icon_url.ts'

	export let entityId: string
	export let flagCode: string | undefined = undefined
	export let flagAsset: string | undefined = undefined
	export let eraId: string = MODERN_ERA_ID
	export let className = ''
	export let size: 'sm' | 'lg' = 'sm'

	$: src = getFlagIconUrl({ eraId, entityId, flagCode, flagAsset })
	$: wrapperClass = size === 'lg' ? 'h-8 w-12' : 'h-3.5 w-[1.3125rem]'
</script>

{#if src}
	<span class="inline-flex shrink-0 items-center justify-center {wrapperClass}">
		<img
			{src}
			alt=""
			aria-hidden="true"
			loading="lazy"
			decoding="async"
			class="flag-icon max-h-full max-w-full object-contain {className}"
		/>
	</span>
{/if}
