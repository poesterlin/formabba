import { MessageType, type GoogleChatExport, type Message, type Sender } from "./types";

export async function readFileAsText(file: File) {
    const reader = new FileReader();

    return new Promise<string>(res => {
        reader.addEventListener("load", () => res(reader.result as string));
        reader.readAsText(file);
    });
}

const regex = /(?<day>\d{2})\.(?<month>\d{2})\.(?<year>\d{2}), (?<hour>\d{1,2}):(?<minute>\d{2})(.*?) - ((?<sender>.+?):\s)?(?<message>.+)$/

export function format(text: string, maxWidth: number, fontSize: number) {
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

            last = addChromeHeight({
                senderId: sender?.id ?? -1,
                date,
                text: sanitize(result.message),
                type,
                id: i,
                ofSameTypeAsLast: ofSameTypeAsLast && !isFirstOfTheDay,
                ofSameTypeAsNext: false,
                isFirstOfTheDay,
                lines: calculateTextBoxHeight(result.message, maxWidth),
            }, fontSize);

            messages.push(last);
        }
    }

    console.log(wordCache)

    return { messages, senders };
}

export function parseJson(text: string, maxWidth: number, fontSize: number) {
    const messages: Message[] = [];
    const senders: Sender[] = [];
    const months = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

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

            last = addChromeHeight({
                senderId: sender?.id ?? -1,
                date,
                text: sanitize(result.text),
                type,
                id: i,
                ofSameTypeAsLast: ofSameTypeAsLast && !isFirstOfTheDay,
                ofSameTypeAsNext: false,
                isFirstOfTheDay,
                lines: calculateTextBoxHeight(result.text, maxWidth),
            }, fontSize);

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
            height: 1,
            lines: 1,
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

const canvas = new OffscreenCanvas(1, 1);
const context = canvas.getContext("2d");

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

    const words = text.split(" ").map(word => calculateWordWidth(word + " "));

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
    const errorRatePerLine = 0.25;
    const errorRate = 1 - errorRatePerLine * height;
    if (currentWidth > (maxWidth * errorRate)) {
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

function addChromeHeight(message: Omit<Message, "height"> & Partial<Message>, fontSize: number): Message {
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