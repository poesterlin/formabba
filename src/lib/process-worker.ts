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
    const type = file.type;
    const res = type === "application/json" || isParsableJson(text) ? parseJson(text, maxWidth, fontSize) : format(text, maxWidth, fontSize);
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