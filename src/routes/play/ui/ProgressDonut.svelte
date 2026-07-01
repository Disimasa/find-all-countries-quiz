<script lang="ts">
	export let percent: number
	export let size = 128
	export let strokeWidth = 10

	$: clamped = Math.min(100, Math.max(0, percent))
	$: radius = (size - strokeWidth) / 2
	$: circumference = 2 * Math.PI * radius
	$: dashOffset = circumference * (1 - clamped / 100)
	$: center = size / 2
</script>

<div
	class="relative inline-flex items-center justify-center"
	style:width="{size}px"
	style:height="{size}px"
	role="img"
	aria-label="{clamped}%"
>
	<svg class="block -rotate-90" width={size} height={size} viewBox="0 0 {size} {size}">
		<circle
			cx={center}
			cy={center}
			r={radius}
			fill="none"
			class="stroke-base-300/80"
			stroke-width={strokeWidth}
		/>
		<circle
			cx={center}
			cy={center}
			r={radius}
			fill="none"
			class="stroke-emerald-500 transition-[stroke-dashoffset] duration-500 ease-out"
			stroke-width={strokeWidth}
			stroke-linecap="round"
			stroke-dasharray={circumference}
			stroke-dashoffset={dashOffset}
		/>
	</svg>
	<div class="absolute inset-0 flex flex-col items-center justify-center leading-none">
		<span class="text-2xl font-bold tabular-nums text-base-content">{clamped}%</span>
	</div>
</div>
