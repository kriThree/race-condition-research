import { parentPort } from "worker_threads";
import { msgWrapper } from "./workerThreadsManager.async";
import { CounterModel } from "../counter.schema";

parentPort?.on('message', async (msg) => {
    msgWrapper(
        async (msg: any) => {
            try {
                await CounterModel.findByIdAndUpdate(
                    msg.data.id,
                    { $inc: { value: 1 } },
                    { new: true }
                );
                parentPort?.postMessage({ success: true });
            } catch (err) {
                parentPort?.postMessage({ error: err.message });
            }
        }
    )(msg);
})