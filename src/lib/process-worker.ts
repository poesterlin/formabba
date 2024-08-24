import { expose } from "comlink";
import { format, parseJson, readFileAsText } from "./file-reader";
import type { Sender } from "./types";

let senders: Sender[] = [];

async function parse(file: File) {
    if (!file) {
        return;
    }



    const text = await readFileAsText(file);
    const type = file.type;
    const res = type === "application/json" ? parseJson(text) : format(text);
    senders = res.senders;

    setMe(0);

    return res;
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

type PromiseMethod = (...args: never) => Promise<unknown>;

const methods = {
    getSenders,
    parse,
    setMe,
} satisfies Record<string, PromiseMethod>;

export type ProcessWorker = typeof methods;

expose(methods)