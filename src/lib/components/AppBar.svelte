<script>
	import {assets} from '$app/paths'
	export let backpage = null;
</script>


<div class="h-16 w-full flex justify-start items-center text-white fixed z-10 bg-black">
	{#if backpage}
		<a href="{backpage}" class="p-4"><img src="{assets}/arrow_left.svg" width="24" height="24" alt="Back"/></a>
	{/if}

	<slot class="flex-1"></slot>
</div>