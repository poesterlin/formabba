<script lang="ts">
	import { MessageType, type Message, type Sender } from './types';

	export let message: Message;
	export let senders: Sender[];

	$: sender = senders[message.senderId];
	$: pos = message.type === MessageType.Sender ? (sender?.isMe ? 'right' : 'left') : 'center';

	const debug = false;

	const timeFormatter = new Intl.DateTimeFormat('de', {
		hour: 'numeric',
		minute: 'numeric'
	});

	const date = new Date(message.date);
	const formattedDate = timeFormatter.format(date);

	function getFormatedDate(date: Date) {
		const dateFormatter = new Intl.DateTimeFormat('de', {
			year: '2-digit',
			month: '2-digit',
			day: '2-digit'
		});

		return dateFormatter.format(date);
	}
</script>

{#if message.isFirstOfTheDay}
	<small class="date">
		{getFormatedDate(date)}
	</small>
{/if}

<div
	class="message"
	class:system={message.type === MessageType.System}
	class:noTopMargin={message.ofSameTypeAsLast}
	class:noBottomMargin={message.ofSameTypeAsNext}
	class:left={pos === 'left'}
	class:right={pos === 'right'}
	class:center={pos === 'center'}
>
	{#if !message.ofSameTypeAsLast && sender}
		<small style:text-align={pos} class="bold">
			{sender?.name}
		</small>
	{/if}
	<article style:background={sender?.color}>
		<p>{@html message.text}</p>
		<small style:text-align={pos}>
			{formattedDate}
		</small>
	</article>
	<!-- absolute positioned bar to test the height calculation -->
	{#if debug}
		<div
			style="background: {sender?.color ??
				'green'}; position: absolute; z-index: 1; opacity: 0.5; left: 0; right: 0; bottom: 0; border: 1px solid black;"
			style:height={message.height + 'px'}
		>
			<span
				style="opacity: 1; color: black; position: absolute; inset: 0; display: flex; justify-content: center; align-items: center; font-weight: bold; font-size: 1.8rem;"
				>{message.height}px x {message.lines - 1} Lines</span
			>
		</div>
	{/if}
</div>

<style>
	div.message {
		width: 60%;
		max-width: max-content;
		/* text-wrap: pretty; */
		margin: 1rem 2rem;
		transition: all 0.5s cubic-bezier(0.19, 1, 0.22, 1);
		transition-behavior: allow-discrete;
	}

	div.left {
		float: left;
	}

	div.right {
		float: right;
	}

	article {
		border-radius: 12px;
		padding: 0.5rem;
	}

	p {
		margin: 0;
		word-break: break-word;
		white-space: pre-wrap;
	}

	.system {
		width: 80%;
		color: gray;
		margin: 0 auto;
	}

	div.left article {
		border-top-left-radius: 0px;
	}

	div.right article {
		border-top-right-radius: 0px;
	}

	div.noTopMargin {
		margin-top: 0.1rem;
	}

	div.noTopMargin article {
		border-top-left-radius: 12px;
		border-top-right-radius: 12px;
	}

	div.noBottomMargin {
		margin-bottom: 0.1rem;
	}

	small {
		width: 100%;
		display: inline-block;
		color: rgb(31, 31, 31);
	}

	.bold {
		font-weight: bold;
	}

	.date {
		text-align: center;
		width: 100%;
		position: sticky;
		top: 1rem;
	}
</style>
