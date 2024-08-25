import { MessageType, type GoogleChatExport, type Message, type Sender } from "./types";

export async function readFileAsText(file: File) {
    const reader = new FileReader();

    return new Promise<string>(res => {
        reader.addEventListener("load", () => res(reader.result as string));
        reader.readAsText(file);
    });
}

const regex = /(?<day>\d{2})\.(?<month>\d{2})\.(?<year>\d{2}), (?<hour>\d{2}):(?<minute>\d{2}) - ((?<sender>.+?):\s)?(?<message>.+)$/

export function format(text: string) {
    const messages: Message[] = [];
    const senders: Sender[] = [];

    const lines = text.split("\n");

    let last: Message | undefined = undefined;

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
                ofSameTypeAsLast: ofSameTypeAsLast && !isFirstOfTheDay,
                ofSameTypeAsNext: false,
                isFirstOfTheDay,
            }

            messages.push(last);
        }
    }

    return { messages, senders };
}

export function parseJson(text: string) {
    const messages: Message[] = [];
    const senders: Sender[] = [];
    const months = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

    try {
        const json = JSON.parse(text) as GoogleChatExport[];
        let last: Message | undefined = undefined;

        for (let i = 0; i < json.length; i++) {
            const result = json[i];
            if (!result.text) {
                continue;
            }

            const name = result.creator.name;
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

            // created_date: "Donnerstag, 16. März 2023 um 16:59:19 UTC"
            const regex = /(?<day>\d{2})\. (?<month>.+?) (?<year>\d{4}) um (?<hour>\d{2}):(?<minute>\d{2}):(?<second>\d{2}).*$/
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

            last = {
                senderId: sender?.id ?? -1,
                date,
                text: sanitize(result.text),
                type,
                id: i,
                ofSameTypeAsLast: ofSameTypeAsLast && !isFirstOfTheDay,
                ofSameTypeAsNext: false,
                isFirstOfTheDay,
            }

            messages.push(last);
        }


    } catch (e) {
        console.error(e);

        messages.push({
            senderId: -1,
            date: new Date(),
            text: "Error parsing JSON\n" + e,
            type: MessageType.System,
            id: 0,
            ofSameTypeAsLast: false,
            ofSameTypeAsNext: false,
            isFirstOfTheDay: false,
        });
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