<script lang="ts">
	import { activeEraTheme } from '../map_shell'

	export let show = false
</script>

{#if show}
	<div
		class="pointer-events-none absolute inset-0 z-[2] opacity-[0.1] mix-blend-multiply"
		aria-hidden="true"
		style:background-image="url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E')"
	></div>
{/if}
