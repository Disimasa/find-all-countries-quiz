<script lang="ts">
	import { t } from '@i18n'
</script>

<div class="pointer-events-none flex h-screen flex-col p-4 sm:p-6">
	<header class="pointer-events-auto flex max-w-md gap-2 items-center">
		<a
			href="/"
			class="w-fit rounded-lg bg-base-100/90 px-3 py-1.5 text-sm font-medium text-base-content shadow-sm backdrop-blur-sm"
		>
			{$t('home')}
		</a>
		<h1 class="text-lg font-semibold text-base-content drop-shadow-sm">
			{$t('exploreTitle')}
		</h1>
	</header>
</div>
