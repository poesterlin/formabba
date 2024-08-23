<script lang="ts">
	import { format, readFileAsText, senders, type Message } from '$lib/file-reader';
	import MessageBubble from '$lib/message.svelte';

	let messages: Message[] = [];
	let myName = '';

	$: {
		if (myName) {
			setMe(myName);
		}
	}

	async function read(event: Event) {
		const target = event.target as HTMLInputElement;
		if (!target.files) {
			return;
		}

		const [file] = target.files;
		const content = await readFileAsText(file);
		messages = format(content);
	}

	function setMe(myName: string) {
		const me = senders[myName];
		if (!me) {
			return;
		}

		for (const sender in senders) {
			senders[sender].isMe = false;
		}

		me.isMe = true;
		messages = messages;
	}
</script>

{#if messages.length === 0}
	<input type="file" on:change={read} />
{:else}
	<select bind:value={myName}>
		<option hidden>Select POV</option>
		{#each Object.keys(senders) as sender}
			<option value={sender}> {sender}</option>
		{/each}
	</select>

	<main>
		{#each messages as message (message.id)}
			<MessageBubble {message}></MessageBubble>
		{/each}
	</main>
{/if}
