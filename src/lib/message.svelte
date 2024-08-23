<script lang="ts">
	import { MessageType, type Message } from './file-reader';

	export let message: Message;

	$: pos =
		message.type === MessageType.Sender ? (message.sender?.isMe ? 'right' : 'left') : 'center';
</script>

<div
	style:float={pos}
	class:system={message.type === MessageType.System}
	class:noTopMargin={message.ofSameTypeAsLast}
	class:noBottomMargin={message.ofSameTypeAsNext}
	class={pos}
>
	{#if !message.ofSameTypeAsLast && message.sender}
		<small style:text-align={pos}>
			{message.sender?.name}
		</small>
	{/if}
	<article style:background={message.sender?.color}>
		<p>{@html message.text}</p>
	</article>
</div>

<style>
	div {
		width: 60vw;
		text-wrap: pretty;
		margin: 1rem 2rem;
	}

	article {
		border-radius: 12px;
	}

	p {
		margin: 0;
		padding: 0.7rem;
	}

	.system {
		width: 80%;
		color: gray;
        margin: 0 auto;
	}

	div:global(.left) article {
		border-top-left-radius: 0px;
	}

	div:global(.right) article {
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
        font-weight: bold;
		display: inline-block;
	}
</style>
