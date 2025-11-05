import { parentPort, Worker } from "worker_threads";
import os from "os";
import comlink from "comlink"
import { randomUUID } from "crypto";

export class WorkerManager {
    private pool: Worker[] = []
    private available: number[] = [];
    private queue: Array<{
        data: any;
        resolve: (value: any) => void;
        reject: (error: any) => void;
    }> = [];
    constructor(
        private path,
        private mongoUri,
        private poolSize,
        private logger
    ) {

    }
    async connect() {
        const promises: Promise<any>[] = [];

        for (let i = 0; i < this.poolSize; i++) {
            promises.push(this.createWorker(i));
        }

        await Promise.all(promises);
        console.log(`✓ ${this.poolSize} workers ready`);
    }
    createWorker(index: number) {
        return new Promise((resolve, reject) => {

            const worker = new Worker(this.path, {
                execArgv: ['-r', 'ts-node/register'],
                workerData: { mongoUri: this.mongoUri, id: randomUUID() }
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

            resolve(1);
        })
    }

    private handleResult(workerIndex: number, result: any) {
        this.available.push(workerIndex);

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

    async runAll(tasks) {
        const results: any[] = [];
        const running: Promise<any>[] = [];

        for (const task of tasks) {
            const promise = this.runTask(task);
            running.push(promise);

            if (running.length >= 3) {
                results.push(await Promise.race(running));
            }
        }

        results.push(...(await Promise.all(running)));
        return results;
    }
    async destroy() {
        await Promise.all(
            this.pool.map(worker => worker.terminate())
        );
        console.log('Workers terminated');
    }
}