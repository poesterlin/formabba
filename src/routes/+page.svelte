<script lang="ts">
	import MessageBubble from '$lib/message.svelte';
	import type { Message, Sender } from '$lib/types';
	import { getWorkerInstance } from '$lib/worker-helper';
	import VirtualList from '@sveltejs/svelte-virtual-list';
	import { tick } from 'svelte';

	let messages: Message[] = [];
	let senders: Sender[] = [];
	let mySenderId = 0;
	let loading = false;
	let start = 0;
	let fileName = '';
	let scroller: HTMLDivElement;

	$: {
		if (mySenderId > -1) {
			setMe(mySenderId);
		}
	}

	// store scroll position
	$: {
		if (start && scroller) {
			const item = scroller.querySelector('svelte-virtual-list-viewport');
			const scroll = item?.scrollTop;
			console.log('scroll', scroll);
			localStorage.setItem(fileName, scroll?.toString() ?? '0');
		}
	}

	const dateFormatter = new Intl.DateTimeFormat('de', {
		year: '2-digit',
		month: '2-digit',
		day: '2-digit'
	});

	$: currentDate = start > 0 ? new Date(messages[start].date) : new Date();
	$: formattedDate = dateFormatter.format(currentDate);

	async function read(event: Event) {
		const target = event.target as HTMLInputElement;
		if (!target.files) {
			return;
		}

		loading = true;

		const [file] = target.files;
		const worker = getWorkerInstance();
		const res = await worker.parse(file);
		messages = res.messages;
		senders = res.senders;

		fileName = file.name;

		let item = localStorage.getItem(fileName);
		if (item) {
			let start = parseInt(item);
			if (start) {
				await tick();
				const el = scroller.querySelector('svelte-virtual-list-viewport')!;
				// manually scroll to the last position
				el.scrollTo(0, start);
			}
		}

		loading = false;
	}

	async function setMe(mySenderId: number) {
		const worker = getWorkerInstance();
		await worker.setMe(mySenderId);
		senders = await worker.getSenders();
	}
</script>

{#if messages.length === 0}
	<input type="file" on:change={read} />
	{#if loading}
		<p>Loading...</p>
	{/if}
{:else}
	<main>
		<label>
			Aus Sicht von:
			<select bind:value={mySenderId}>
				{#each senders as sender}
					<option value={sender.id}> {sender.name}</option>
				{/each}
			</select>
		</label>
		<div bind:this={scroller}>
			<em>{formattedDate}</em>
			<VirtualList items={messages} let:item bind:start>
				<MessageBubble message={item} {senders}></MessageBubble>
			</VirtualList>
		</div>
	</main>
{/if}

<style>
	main {
		height: 100dvh;
		width: min(90vw, 60rem);
		margin: 0 auto;
		display: flex;
		flex-direction: column;
	}

	select {
		flex: 1;
		padding: 0.5rem;
	}

	div {
		flex: 1;
		overflow-y: auto;
		position: relative;
		padding-top: 2rem;
	}

	em {
		position: absolute;
		top: 5px;
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
</style>
