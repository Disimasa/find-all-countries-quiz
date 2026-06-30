<script lang="ts">
	import { page } from '$app/stores'
	import { t } from '@i18n'
</script>

<div class="pointer-events-auto flex min-h-screen items-center justify-center p-4">
	<section
		class="w-full max-w-sm rounded-2xl border border-base-300/80 bg-base-100/95 p-6 text-center shadow-lg backdrop-blur-md"
	>
		<p class="text-sm font-semibold uppercase tracking-wider text-primary">
			{$page.status}
		</p>
		<h1 class="mt-2 text-xl font-bold leading-tight text-base-content">{$t('errorTitle')}</h1>
		<p class="mt-2 text-sm leading-snug text-base-content/65">
			{$page.error?.message ?? $t('errorHint')}
		</p>
		<a href="/" class="btn btn-primary mt-5 w-full rounded-xl">{$t('errorHome')}</a>
	</section>
</div>
