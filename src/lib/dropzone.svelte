<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';

	let file: File | null = null;
	let fileInput: HTMLInputElement;
	let isOver = false;
	let isMobile = false;

	const dispatch = createEventDispatcher();

	onMount(() => {
		detectMobile();
	});

	function detectMobile() {
		const userAgent = navigator.userAgent;
		isMobile = /android|iPad|iPhone|iPod/i.test(userAgent);
	}

	function handleFileSelect(event: any) {
		file = event.target.files[0];
		abortIfZip();
		dispatch('change', file);
	}

	function handleDrop(event: any) {
		event.preventDefault();
		file = event.dataTransfer.files[0];
		abortIfZip();
		dispatch('change', file);
	}

	function abortIfZip() {
		if (!file) {
			return;
		}

		const isZip = file.type === 'application/zip' || file.type === 'application/x-zip-compressed';

		if (!isZip) {
			return;
		}

		alert('Please extract the zip file and select the .txt file inside');
		fileInput.value = '';
		file = null;
	}

	function handleDragOver(event: any) {
		event.preventDefault();
		isOver = true;
	}

	function handleClick() {
		fileInput.click();
	}
</script>

<div
	class="dropzone"
	on:drop={handleDrop}
	on:dragover={handleDragOver}
	on:dragleave={() => (isOver = false)}
	role="button"
	tabindex="0"
	on:click={handleClick}
	on:keydown={(e) => e.key === 'Enter' && handleClick()}
	class:dragover={isOver}
>
	{#if isMobile}
		<p>Click to select a file</p>
	{:else}
		<p>Drag and drop a file here, or click to select a file</p>
	{/if}
	<input type="file" on:change={handleFileSelect} style="display: none;" bind:this={fileInput} />
</div>

<style>
	.dropzone {
		border: 2px dashed #ccc;
		border-radius: 4px;
		padding: 20px;
		text-align: center;
		cursor: pointer;
		inset: 0px;
		position: absolute;
		margin: auto;
		height: 25%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.dropzone.dragover {
		border-color: #000;
	}
</style>
