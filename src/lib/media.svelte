<script context="module" lang="ts">
	let current: HTMLMediaElement | null = null;
</script>

<script lang="ts">
	import type { FileAttachment, Message } from './types';

	export let message: Message;
	export let files: FileAttachment[];

	const file = files.find((f) => message.text.includes(f.name));
	const { isVideo, isImage, isVoice } = file || {};

	function play(e: Event) {
		const audio = e.currentTarget;

		if (audio !== current) {
			current?.pause();
			current = audio as HTMLMediaElement;
		}
	}
</script>

{#if file}
	<a
		href={file.data}
		target="_blank"
		download={isImage || isVideo || isVoice ? undefined : file.name}
	>
		{#if isImage}
			<img src={file.data} alt={file.name} />
		{:else if isVoice}
			<audio controls src={file.data} on:play={play} />
		{:else if isVideo}
			<!-- svelte-ignore a11y-media-has-caption -->
			<video controls src={file.data} on:play={play} />
		{:else}
			{file.name}
		{/if}
	</a>
{/if}

<style>
	a {
		width: 100%;
	}

	img,
	video {
		height: 300px;
		width: 100%;
		overflow: hidden;
		object-fit: cover;
	}
</style>
