
export async function readFileAsText(file: File) {
    const reader = new FileReader();

    return new Promise<string>(res => {
        reader.addEventListener("load", () => res(reader.result as string));
        reader.readAsText(file);
    });
}

export enum MessageType {
    System,
    Sender
}

export interface Sender {
    name: string,
    color: string,
    isMe: boolean
}

export interface Message {
    type: MessageType,
    text: string,
    sender?: Sender,
    date: Date,
    id: number,
    ofSameTypeAsLast: boolean,
    ofSameTypeAsNext: boolean,
}

const regex = /(?<day>\d{2})\.(?<month>\d{2})\.(?<year>\d{2}), (?<hour>\d{2}):(?<minute>\d{2}) - ((?<sender>[\s+\d]{5,}|[a-zA-Z\s]+):\s)?(?<message>.+)$/
export const senders: { [key: string]: Sender } = {};

export function format(text: string) {
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
            let sender = senders[name];

            if (!sender && type === MessageType.Sender) {
                sender = {
                    name,
                    color: hashColor(name),
                    isMe: false
                };
                senders[name] = sender;
            }

            let ofSameTypeAsLast = false;
            if (last && last.sender === sender) {
                ofSameTypeAsLast = true;
                last.ofSameTypeAsNext = true;
            }

            last = {
                sender,
                date: new Date(
                    parse(result.year),
                    parse(result.month) - 1,
                    parse(result.day),
                    parse(result.hour),
                    parse(result.minute)
                ),
                text: sanitize(result.message),
                type,
                id: i,
                ofSameTypeAsLast,
                ofSameTypeAsNext: false,
            }

            messages.push(last);
        }
    }

    return messages;

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