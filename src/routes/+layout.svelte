<script lang="ts">
	import { browser } from '$app/environment'
	import { page } from '$app/stores'
	import { onMount } from 'svelte'
	import 'maplibre-gl/dist/maplibre-gl.css'
	import { AwaitableDialog } from 'svelte-awaitable-dialog'
	import './layout.css'
	import favicon from '$lib/assets/favicon.svg'
	import { getLocale, locale } from '@i18n'
	import { siteMeta, siteName } from '$lib/site/meta'
	import MapShell from './ui/MapShell.svelte'

	$: meta = siteMeta[$locale]
	$: isDevToolRoute = $page.url.pathname.startsWith('/dev')

	onMount(() => {
		document.documentElement.lang = getLocale()
		return locale.subscribe((value) => {
			document.documentElement.lang = value
		})
	})
</script>

<svelte:head>
	<link rel="icon" href={favicon} type="image/svg+xml" />
	<link rel="apple-touch-icon" href={favicon} />

	<title>{meta.title}</title>
	<meta name="description" content={meta.description} />
	<meta name="keywords" content={meta.keywords} />
	<meta name="author" content={siteName} />
	<meta name="theme-color" content="#7c3aed" />

	<meta property="og:type" content="website" />
	<meta property="og:site_name" content={siteName} />
	<meta property="og:title" content={meta.title} />
	<meta property="og:description" content={meta.description} />
	<meta property="og:image" content="/og-cover.svg" />
	<meta property="og:locale" content={$locale === 'ru' ? 'ru_RU' : 'en_US'} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={meta.title} />
	<meta name="twitter:description" content={meta.description} />
	<meta name="twitter:image" content="/og-cover.svg" />
</svelte:head>

{#if browser && !isDevToolRoute}
	<MapShell />
{/if}

<div
	class={isDevToolRoute
		? 'fixed inset-0 z-50 overflow-hidden bg-base-200'
		: 'relative z-10 h-screen overflow-hidden pointer-events-none'}
>
	<slot />
</div>

<AwaitableDialog />
