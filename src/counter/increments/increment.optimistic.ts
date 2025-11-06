import { parentPort, workerData } from "worker_threads";
import { msgWrapper } from "./workerThreadsManager.async";
import { CounterModel } from "../counter.schema";
let retryCount = 0

parentPort?.on('message', async (msg) => {
    msgWrapper(
        async (msg: any) => {
            try {
                const maxRetries = 30;
                for (let i = 0; i < maxRetries; i++) {
                    const doc = await CounterModel.findById(msg.data.id);
                    const result = await CounterModel.findOneAndUpdate(
                        {
                            _id: doc?._id,
                            // version: doc?.version,
                            //Иммитация кофнликта  
                            version: doc?.version
                        },
                        {
                            $inc: { value: 1, version: 1 },
                            $set: { updatedAt: new Date() }
                        },
                        { new: true }
                    );
                    if (result) {
                        parentPort?.postMessage({ success: true, meta: { retryCount } });
                        return
                    }
                    if (i > 3) {
                        await new Promise(resolve => setTimeout(resolve, workerData.index * 101));
                    }
                    // console.log('Повторная попытка', workerData.id, i, doc?.value, doc?.version);
                    retryCount++;
                }

                parentPort?.postMessage({ error: "max retries" });
            } catch (err) {

                parentPort?.postMessage({ error: err.message });
            }
        }
    )(msg);
})