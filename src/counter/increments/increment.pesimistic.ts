import { parentPort } from "worker_threads";
import { msgWrapper } from "./workerThreadsManager.async";
import { CounterModel } from "../counter.schema";

let retryCount = 0

parentPort?.on('message', async (msg) => {
    msgWrapper(async (msg: any) => {
        const maxRetries = 25;
        const lockTimeout = 5000;
        let backoff = 10;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    retryCount++;
                }
                const locked = await CounterModel.findOneAndUpdate(
                    {
                        _id: msg.data.id,
                        $or: [
                            { isLocked: false },
                            {
                                lockedAt: {
                                    $lt: new Date(Date.now() - lockTimeout)
                                }
                            }
                        ]
                    },
                    {
                        $set: {
                            isLocked: true,
                            lockedAt: new Date(),
                        }
                    },
                    { new: true }
                );

                if (locked) {
                    try {
                        locked.value += 1;
                        await locked.save();

                        return parentPort?.postMessage({
                            success: true,
                            data: locked.toObject(),
                            attempts: attempt + 1,
                            meta: { retryCount }
                        });

                    } finally {
                        await CounterModel.findByIdAndUpdate(msg.data.id, {
                            $set: { isLocked: false, lockedBy: null }
                        });

                        await new Promise(r => setTimeout(r, Math.random() * 10));
                    }
                }

                const jitter = Math.random() * backoff * 0.3;
                await new Promise(r => setTimeout(r, backoff + jitter));
                backoff = Math.min(backoff * 1.5, 200);

            } catch (err) {

                await new Promise(r => setTimeout(r, backoff));
                backoff = Math.min(backoff * 1.5, 200);
            }
        }

        parentPort?.postMessage({
            success: false,
            error: 'Failed to acquire lock after max retries',
            attempts: maxRetries
        });

    })(msg);
});