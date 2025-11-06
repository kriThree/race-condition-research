import { parentPort, Worker } from "worker_threads";
import os from "os";
import comlink from "comlink"
import { randomUUID } from "crypto";
import { Logger } from "@nestjs/common";
import { log } from "console";
import { INFO_LEVEL } from "src/config/logger.config";

export class WorkerContext {
    constructor(
        public index: number,
        public id: string,
        public mongoUri: string,
    ) { }
}

export class WorkerManager {
    private pool: Worker[] = []
    private available: number[] = [];
    private queue: Array<{
        data: any;
        resolve: (value: any) => void;
        reject: (error: any) => void;
    }> = [];
    public tasksStats: Map<number, number> = new Map();
    public meta: any
    constructor(
        private path,
        private mongoUri,
        private poolSize,
        private logger,
        private giveStats = false

    ) {

    }
    async connect() {
        const promises: Promise<any>[] = [];
        for (let i = 0; i < this.poolSize; i++) {
            promises.push(this.createWorker(i));
        }

        await Promise.all(promises);

    }
    createWorker(index: number) {
        return new Promise((resolve, reject) => {


            this.tasksStats.set(index, 0);

            const worker = new Worker(this.path, {
                execArgv: ['-r', 'ts-node/register'],
                workerData: new WorkerContext(index, randomUUID(), this.mongoUri),
            });

            const readyHandler = (msg: any) => {
                if (msg.type === 'ready') {
                    worker.off('message', readyHandler);
                    worker.off('error', errorHandler);

                    worker.on('message', (result) => this.handleResult(index, result));
                    worker.on('error', (err) => {
                        console.error(`Worker ${index} error:`, err);
                    });

                    this.pool[index] = worker;
                    this.available.push(index);
                    resolve(1);
                    this.processQueue();
                }
            };

            const errorHandler = (err: Error) => {
                worker.off('message', readyHandler);
                worker.off('error', errorHandler);
                reject(err);
            };

            worker.once('message', readyHandler);
            worker.once('error', errorHandler);

            worker.postMessage({ type: 'connect' });
        })
    }

    private handleResult(workerIndex: number, result: any) {
        this.available.push(workerIndex);
        if (result.meta) this.meta = result.meta
        if (this.giveStats) {
            this.tasksStats.set(workerIndex, (this.tasksStats.get(workerIndex) || 0) + 1);
        }
        this.processQueue();
    }

    private processQueue() {
        if (this.queue.length === 0 || this.available.length === 0) {
            return;
        }
        const task = this.queue.shift();
        const workerIndex = this.available.shift();

        if (!task || workerIndex === undefined) return;

        const worker = this.pool[workerIndex];

        const messageHandler = (result: any) => {
            worker.off('message', messageHandler);

            if (result.success) {
                task.resolve(result.data);
            } else {
                task.reject(new Error(result.error));
            }
        };

        worker.once('message', messageHandler);
        worker.postMessage({ type: 'task', data: task.data });
    }

    runTask(task): Promise<any> {
        return new Promise((resolve, reject) => {
            this.queue.push({ data: task, resolve, reject });
            this.processQueue();
        });
    }

    async destroy() {
        await Promise.all(
            this.pool.map(worker => worker.terminate())
        );
        console.log('Workers terminated');
    }
}