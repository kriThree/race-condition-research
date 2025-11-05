import { parentPort } from "worker_threads";
import { msgWrapper } from "./workerThreadsManager.async";
import { CounterModel } from "../counter.schema";

parentPort?.on('message', async (msg) => {
    msgWrapper(
        async (msg: any) => {
            const maxRetries = 10;
            const lockTimeout = 5000; // 5 секунд

            for (let attempt = 0; attempt < maxRetries; attempt++) {
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

                if (!locked) {
                    await new Promise(resolve => setTimeout(resolve, 50 * (attempt + 1)));
                    continue;
                }

                try {
                    locked.value += 1;
                    await locked.save();
                    return locked;
                } finally {
                    await CounterModel.findByIdAndUpdate(msg.data.id, {
                        $set: { isLocked: false }
                    });
                }
            }
        }
    )(msg);
})