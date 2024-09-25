<script lang="ts">
	import Dropzone from '$lib/dropzone.svelte';
	import MessageBubble from '$lib/message.svelte';
	import type { FileAttachment, Message, Sender } from '$lib/types';
	import { getWorkerInstance } from '$lib/worker-helper';
	import VirtualList from 'svelte-tiny-virtual-list';

	let messages: Message[] = [];
	let senders: Sender[] = [];
	let files: FileAttachment[] = [];
	let mySenderId = 0;
	let loading = false;
	let start = 0;
	let fileName = '';
	let query = '';
	let searchResults: number[] = [];
	let searchResultIndex = 0;
	let scrollToIndex: number | undefined = undefined;

	$: {
		if (mySenderId > -1) {
			setMe(mySenderId);
		}
	}

	$: {
		let index = searchResults[searchResultIndex];
		if (index) {
			scrollToIndex = index;
		}
	}

	const dateFormatter = new Intl.DateTimeFormat('de', {
		year: '2-digit',
		month: '2-digit',
		day: '2-digit'
	});

	$: currentDate = start > 0 ? new Date(messages[start].date) : new Date();
	$: formattedDate = dateFormatter.format(currentDate);

	async function read(event: CustomEvent<File>) {
		const file = event.detail;

		if (!file) {
			return;
		}

		const worker = getWorkerInstance();
		const { bubbleMaxSize, fontSize } = getBubbleMaxWidth();
		const res = await worker.parse(file, bubbleMaxSize, fontSize);
		if (!res) {
			alert('Error parsing file');
			return;
		}

		messages = res.messages;
		senders = res.senders;
		files = res.files ?? [];
		console.log(files);

		fileName = file.name;

		let item = localStorage.getItem(fileName);
		if (item) {
			let start = parseInt(item);
			if (start) {
				scrollToIndex = start;
			}
		}

		loading = false;
	}

	async function setMe(mySenderId: number) {
		const worker = getWorkerInstance();
		await worker.setMe(mySenderId);
		senders = await worker.getSenders();
	}

	function getBubbleMaxWidth() {
		const width = window.innerWidth;

		// get the size of 1rem
		const fontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);

		// match with css max-width
		const maxContainerSize = Math.min(60 * fontSize, 0.9 * width);

		// 60% of the max container size
		const padding = 2 * fontSize;
		const bubbleMaxSize = 0.6 * maxContainerSize - padding;

		return { bubbleMaxSize, fontSize };
	}

	async function search() {
		const worker = getWorkerInstance();
		searchResults = await worker.search(query);
		searchResultIndex = 0;
	}

	function setDate(event: CustomEvent<{ offset: number }>) {
		const currentOffset = event.detail.offset;
		let offset = 0;

		for (let i = 0; i < messages.length; i++) {
			offset += messages[i].height;
			if (offset > currentOffset) {
				start = i;
				break;
			}
		}

		localStorage.setItem(fileName, start.toString());
	}
</script>

{#if messages.length === 0}
	<main>
		<Dropzone on:change={read} />
		{#if loading}
			<p>Loading...</p>
		{/if}
	</main>
{:else}
	<main>
		<form on:submit|preventDefault={search}>
			<div>
				<input type="search" bind:value={query} />
				<button type="button" on:click={search}>Search</button>

				{#if searchResults.length > 0 && query}
					<button
						type="button"
						on:click={() => searchResultIndex--}
						disabled={searchResultIndex === 0}
					>
						&lt;
					</button>
					<span>
						{searchResultIndex + 1} / {searchResults.length}
					</span>
					<button
						type="button"
						on:click={() => searchResultIndex++}
						disabled={searchResultIndex === searchResults.length - 1}
					>
						&gt;
					</button>
				{/if}
			</div>
			<label>
				Aus Sicht von:
				<select bind:value={mySenderId}>
					{#each senders as sender}
						<option value={sender.id}> {sender.name}</option>
					{/each}
				</select>
			</label>
		</form>
		<em>{formattedDate}</em>
		<VirtualList
			width="100%"
			height={window.innerHeight - 130}
			itemCount={messages.length}
			bind:scrollToIndex
			scrollToAlignment="center"
			scrollToBehaviour="auto"
			itemSize={(index) => messages[index].height}
			on:afterScroll={setDate}
		>
			<div
				slot="item"
				let:index
				let:style
				{style}
				class:found={index === scrollToIndex && query}
				class="no-scroll"
			>
				<MessageBubble message={messages[index]} {senders} {files}></MessageBubble>
			</div>
		</VirtualList>
	</main>
{/if}

<style>
	main {
		height: 100dvh;
		width: min(90vw, 60rem);
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		position: relative;
	}

	select {
		flex: 1;
		padding: 0.5rem;
	}

	em {
		position: absolute;
		top: 65px;
		left: 0;
		right: 0;
		text-align: center;
		margin: auto;
		width: max-content;
		background: white;
		z-index: 1;
		border-radius: 12px;
		padding: 0.5rem;
		translate: -9px;
		font-style: normal;
	}

	label {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 2rem;
	}

	:global(svelte-virtual-list-row) {
		position: relative;
	}

	.found :global(div.message) {
		outline: 3px solid yellow;
		border-radius: 12px;
	}

	.no-scroll {
		overflow: hidden;
	}

	form {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		margin: 1rem;
	}

	input[type='search'] {
		padding: 0.5rem;
	}

	button {
		padding: 0.5rem;
	}
</style>
