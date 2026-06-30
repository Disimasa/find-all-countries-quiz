<script lang="ts">
	import 'leaflet/dist/leaflet.css'
	import { AwaitableDialog } from 'svelte-awaitable-dialog'
	import './layout.css'
	import favicon from '$lib/assets/favicon.svg'
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<slot />

<AwaitableDialog />
