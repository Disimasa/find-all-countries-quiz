<script lang="ts">
	import 'maplibre-gl/dist/maplibre-gl.css'
	import { AwaitableDialog } from 'svelte-awaitable-dialog'
	import './layout.css'
	import favicon from '$lib/assets/favicon.svg'
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<slot />

<AwaitableDialog />
