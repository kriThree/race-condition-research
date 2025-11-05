import { parentPort } from "worker_threads";
import { msgWrapper } from "./workerThreadsManager.async";
import { CounterModel } from "../counter.schema";

parentPort?.on('message', async (msg) => {
    msgWrapper(
        async (msg: any) => {
            try {
                const maxRetries = 5;
                for (let i = 0; i < maxRetries; i++) {
                    const doc = await CounterModel.findById(msg.data.id);
                    const result = await CounterModel.findByIdAndUpdate(
                        { _id: doc?._id, version: doc?.version },
                        {
                            $inc: { value: 1, version: 1 },
                            $set: { updatedAt: new Date() }
                        },
                        { new: true }
                    );

                    if (result) {
                        parentPort?.postMessage({ success: true });
                        return
                    }

                }

                parentPort?.postMessage({ error: "max retries" });
            } catch (err) {

                parentPort?.postMessage({ error: err.message });
            }
        }
    )(msg);
})