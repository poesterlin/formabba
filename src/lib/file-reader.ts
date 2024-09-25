/// <reference lib="webworker" />
/// <reference lib="esnext" />

import { BlobReader, BlobWriter, TextWriter, ZipReader } from '@zip.js/zip.js';
import {
	MessageType,
	type FileAttachment,
	type GoogleChatExport,
	type Message,
	type Sender
} from './types';
import { fileTypeFromBuffer } from 'file-type';

export async function readFileAsText(file: File) {
	const reader = new FileReader();

	return new Promise<string>((res) => {
		reader.addEventListener('load', () => res(reader.result as string));
		reader.readAsText(file);
	});
}

const regex =
	/(?<day>\d{2})\.(?<month>\d{2})\.(?<year>\d{2}), (?<hour>\d{1,2}):(?<minute>\d{2})(.*?) - ((?<sender>.+?):\s)?(?<message>.+)$/;

export function format(text: string, maxWidth: number, fontSize: number) {
	const messages: Message[] = [];
	const senders: Sender[] = [];

	const lines = text.split('\n');

	let last: Message | undefined = undefined;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const result = regex.exec(line)?.groups;
		if (!result) {
			if (!last) {
				continue;
			}

			last.text += '<br>' + sanitize(line);
			continue;
		}

		if (!result.message) {
			continue;
		}

		if (result.message === 'null') {
			continue;
		}

		const name = result.sender;
		const type = name ? MessageType.Sender : MessageType.System;
		let sender = senders.find((s) => s.name === name);

		if (!sender && type === MessageType.Sender) {
			sender = {
				name,
				color: hashColor(name),
				isMe: false,
				id: senders.length
			};
			senders.push(sender);
		}

		const date = new Date(
			parse(result.year) + 2000,
			parse(result.month) - 1,
			parse(result.day),
			parse(result.hour),
			parse(result.minute)
		);

		let ofSameTypeAsLast = false;
		if (last && last.senderId === sender?.id) {
			ofSameTypeAsLast = true;
			last.ofSameTypeAsNext = true;
		}

		let isFirstOfTheDay = true;
		if (last) {
			isFirstOfTheDay = !isSameDay(last.date, date);
		}

		const fileRegex = /(?<filename>.+?)\.(?<extension>.+?) \(.+?\)$/;
		const isFile = fileRegex.test(result.message);

		last = addChromeHeight(
			{
				senderId: sender?.id ?? -1,
				date,
				text: sanitize(result.message),
				type,
				id: i,
				ofSameTypeAsLast: ofSameTypeAsLast && !isFirstOfTheDay,
				ofSameTypeAsNext: false,
				isFirstOfTheDay,
				lines: calculateTextBoxHeight(result.message, maxWidth),
				isFile
			},
			fontSize
		);

		messages.push(last);
	}

	return { messages, senders };
}

export function parseJson(text: string, maxWidth: number, fontSize: number) {
	const messages: Message[] = [];
	const senders: Sender[] = [];
	const months = [
		'Januar',
		'Februar',
		'März',
		'April',
		'Mai',
		'Juni',
		'Juli',
		'August',
		'September',
		'Oktober',
		'November',
		'Dezember'
	];

	try {
		const json = JSON.parse(text) as GoogleChatExport;
		let last: Message | undefined = undefined;
		const jsonMessages = json.messages;

		for (let i = 0; i < jsonMessages.length; i++) {
			const result = jsonMessages[i];
			if (!result.text) {
				continue;
			}

			const name = result.creator.name;
			const type = name ? MessageType.Sender : MessageType.System;
			let sender = senders.find((s) => s.name === name);

			if (!sender && type === MessageType.Sender) {
				sender = {
					name,
					color: hashColor(name),
					isMe: false,
					id: senders.length
				};
				senders.push(sender);
			}

			const regex =
				/(?<day>\d{2})\. (?<month>.+?) (?<year>\d{4}) um (?<hour>\d{2}):(?<minute>\d{2}):(?<second>\d{2}).*$/;
			const match = regex.exec(result.created_date)?.groups;

			let date = new Date();
			if (match) {
				const month = months.indexOf(match.month);

				date = new Date(
					parse(match.year),
					month,
					parse(match.day),
					parse(match.hour),
					parse(match.minute)
				);
			}

			let ofSameTypeAsLast = false;
			if (last && last.senderId === sender?.id) {
				ofSameTypeAsLast = true;
				last.ofSameTypeAsNext = true;
			}

			let isFirstOfTheDay = true;
			if (last) {
				isFirstOfTheDay = !isSameDay(last.date, date);
			}

			last = addChromeHeight(
				{
					senderId: sender?.id ?? -1,
					date,
					text: sanitize(result.text),
					type,
					id: i,
					ofSameTypeAsLast: ofSameTypeAsLast && !isFirstOfTheDay,
					ofSameTypeAsNext: false,
					isFirstOfTheDay,
					lines: calculateTextBoxHeight(result.text, maxWidth),
					isFile: false
				},
				fontSize
			);

			messages.push(last);
		}
	} catch (e) {
		console.error(e);

		messages.push({
			senderId: -1,
			date: new Date(),
			text: 'Error parsing JSON\n' + e,
			type: MessageType.System,
			id: 0,
			ofSameTypeAsLast: false,
			ofSameTypeAsNext: false,
			isFirstOfTheDay: false,
			height: 1,
			lines: 1,
			isFile: false
		});
	}

	return { messages, senders };
}

function hashColor(text: string) {
	let sum = 0;
	for (let i = 0; i < text.length; i++) {
		sum += ((i + 1) * (text.codePointAt(i) ?? 1)) / (1 << 8);
	}

	const hue = sum % 1;
	return `hsl(${hue * 360}deg 80% 80%)`;
}

function parse(text: string) {
	return parseFloat(text);
}

function sanitize(text: string) {
	return text.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function isSameDay(a: Date, b: Date) {
	return (
		a.getDate() === b.getDate() &&
		a.getMonth() === b.getMonth() &&
		a.getFullYear() === b.getFullYear()
	);
}

const canvas = new OffscreenCanvas(1, 1);
const context = canvas.getContext('2d');

export function setFont(font: string) {
	if (!context) {
		return;
	}

	context.font = font;
}

export function calculateTextBoxHeight(text: string, maxWidth: number) {
	if (!context) {
		return 0;
	}

	const words = text.split(' ').map((word) => calculateWordWidth(word + ' '));

	let height = 2;
	let currentWidth = 0;

	for (let i = 0; i < words.length; i++) {
		currentWidth += words[i];
		let overflow = false;
		while (currentWidth > maxWidth) {
			height++;
			currentWidth -= maxWidth;
			overflow = true;
		}

		if (overflow) {
			currentWidth = words[i] % maxWidth;
		}
	}

	// if the last line is almost full, add another line
	const errorRatePerLine = 0.2;
	const errorRate = 1 - errorRatePerLine * height;
	if (currentWidth > maxWidth * errorRate) {
		height++;
	}

	return height;
}

const wordCache = new Map<string, number>();

function calculateWordWidth(word: string) {
	const cached = wordCache.get(word);
	if (cached) {
		return cached;
	}

	const width = context?.measureText(word).width ?? 0;
	wordCache.set(word, width);
	return width;
}

function addChromeHeight(
	message: Omit<Message, 'height'> & Partial<Message>,
	fontSize: number
): Message {
	let topMargin = fontSize;
	let bottomMargin = fontSize;

	const padding = fontSize;
	let otherElements = 0;

	if (message.isFirstOfTheDay) {
		topMargin += 2 * fontSize;
	}

	if (message.ofSameTypeAsLast) {
		// no top margin
		topMargin = 0.1 * fontSize;
	} else {
		// add height of username
		otherElements += fontSize * 1.1;
	}

	// no bottom margin
	if (message.ofSameTypeAsNext) {
		bottomMargin = 0.1 * fontSize;
	} else {
		// bottomMargin += 0.5 * fontSize;
	}

	const lineDistance = 0.205 * fontSize;
	const lines = message.lines * fontSize + (message.lines - 1) * lineDistance;
	message.height = lines + topMargin + bottomMargin + padding + otherElements;

	return message as Message;
}

export async function readZip(zipFile: File, maxWidth: number, fontSize: number) {
	const reader = new BlobReader(zipFile);
	const zip = new ZipReader(reader);

	const files = await zip.getEntries();
	const textFileIdx = files.findIndex((file) => file.filename.endsWith('.txt') && file.getData);

	if (textFileIdx === -1) {
		return;
	}

	const textFile = files[textFileIdx];
	files.splice(textFileIdx, 1);

	const text = await textFile.getData!(new TextWriter());
	if (!text) {
		return;
	}

	const res = format(text, maxWidth, fontSize) as ReturnType<typeof format> & {
		files?: FileAttachment[];
	};
	res.files = [];

	for (const entry of files) {
		if (!entry.getData) {
			continue;
		}

		let blob = await entry.getData(new BlobWriter());
		if (!blob || blob.size === 0) {
			continue;
		}
		const buffer = await blob.arrayBuffer();
		const mime = await fileTypeFromBuffer(buffer);
		let isImage = false;
		let isVoice = false;
		let isVideo = false;
		if (mime) {
			blob = new Blob([buffer], { type: mime.mime });
			isImage = mime.mime.startsWith('image');
			isVoice = mime.mime.startsWith('audio');
			isVideo = mime.mime.startsWith('video');
		}

		const file = {
			data: URL.createObjectURL(blob),
			name: entry.filename,
			isImage,
			isVoice,
			isVideo
		} satisfies FileAttachment;

		res.files.push(file);
	}
	await zip.close();

	for (const message of res.messages) {
		if (!message.isFile) {
			continue;
		}

		const file = res.files.find((f) => message.text.includes(f.name));
		if (!file) {
			continue;
		}

		message.height += fontSize;
		if (file.isImage || file.isVideo) {
			message.height += 300;
		} else if (file.isVoice) {
			message.height += 100;
		}
	}
	return res;
}
