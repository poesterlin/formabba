import { MessageType, type Message, type Sender } from "./types";

export async function readFileAsText(file: File) {
    const reader = new FileReader();

    return new Promise<string>(res => {
        reader.addEventListener("load", () => res(reader.result as string));
        reader.readAsText(file);
    });
}


const regex = /(?<day>\d{2})\.(?<month>\d{2})\.(?<year>\d{2}), (?<hour>\d{2}):(?<minute>\d{2}) - ((?<sender>.+?):\s)?(?<message>.+)$/

export function format(text: string) {
    const senders: Sender[] = [];
    const lines = text.split("\n");

    let last: Message | undefined = undefined;
    const messages: Message[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const result = regex.exec(line)?.groups;
        if (!result) {
            if (!last) {
                continue;
            }

            last.text += "<br>" + sanitize(line);
            continue;
        }

        if (result.message) {
            const name = result.sender;
            const type = name ? MessageType.Sender : MessageType.System;
            let sender = senders.find(s => s.name === name);

            if (!sender && type === MessageType.Sender) {
                sender = {
                    name,
                    color: hashColor(name),
                    isMe: false,
                    id: senders.length,
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

            last = {
                senderId: sender?.id ?? -1,
                date,
                text: sanitize(result.message),
                type,
                id: i,
                ofSameTypeAsLast,
                ofSameTypeAsNext: false,
                isFirstOfTheDay,
            }

            messages.push(last);
        }
    }

    return { messages, senders };

}

function hashColor(text: string) {
    let sum = 0;
    for (let i = 0; i < text.length; i++) {
        sum += (i + 1) * (text.codePointAt(i) ?? 1) / (1 << 8)
    }

    const hue = sum % 1;
    return `hsl(${hue * 360}deg 80% 80%)`
}

function parse(text: string) {
    return parseFloat(text);
}

function sanitize(text: string) {
    return text.replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function isSameDay(a: Date, b: Date) {
    return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}