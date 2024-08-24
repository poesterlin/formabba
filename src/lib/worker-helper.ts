import { wrap } from "comlink";
import type { ProcessWorker as PW } from "./process-worker";
import WorkerProcess from "./process-worker?worker&inline";

let instance: PW | null = null;

export function getWorkerInstance() {
    if (instance) {
        return instance;
    }

    const worker = new WorkerProcess({ name: "process-worker" });
    instance = wrap<PW>(worker);

    return instance;
}