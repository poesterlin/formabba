import { expose } from "comlink";
import { format, parseJson, readFileAsText, setFont } from "./file-reader";
import type { Message, Sender } from "./types";
import Fuse from "fuse.js";

let senders: Sender[] = [];

const fuse = new Fuse([] as Message[], {
    keys: ["text"],
    threshold: 0.2,
    ignoreLocation: true,
    minMatchCharLength: 3,
});

async function parse(file: File, maxWidth: number, fontSize: number) {
    if (!file) {
        return;
    }

    setFont('"Gill Sans", Calibri');

    const text = await readFileAsText(file);
    const res = file.type === "application/json" || isFixableJson(text) ? parseJson(fixJson(text), maxWidth, fontSize) : format(text, maxWidth, fontSize);
    senders = res.senders;

    fuse.setCollection(res.messages);

    setMe(0);

    return res;
}

function isParsableJson(text: string) {
    try {
        JSON.parse(text);
        return true;
    } catch {
        return false;
    }
}

function fixJson(text: string) {
    if (!text.startsWith("{")) {
        text = "{" + text;
    }

    if (!text.endsWith("}")) {
        text += "}";
    }

    return text;
}

function isFixableJson(text: string) {
    return isParsableJson(fixJson(text));
}

async function setMe(mySenderId: number) {
    const me = senders[mySenderId];
    if (!me) {
        return;
    }

    for (const sender of senders) {
        sender.isMe = false;
    }

    me.isMe = true;
}

async function getSenders() {
    return senders;
}

async function search(text: string) {
    const results = fuse.search(text);
    return results.map(r => r.refIndex).sort((a, b) => a - b);
}

type PromiseMethod = (...args: never) => Promise<unknown>;

const methods = {
    getSenders,
    parse,
    setMe,
    search,
} satisfies Record<string, PromiseMethod>;

export type ProcessWorker = typeof methods;

expose(methods)