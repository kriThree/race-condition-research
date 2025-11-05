import { parentPort, workerData } from "worker_threads";
import { CounterModel } from "../counter.schema";

import mongoose from "mongoose";
import { msgWrapper } from "./workerThreadsManager.async";

parentPort?.on('message', async (msg) => {
    msgWrapper(
        async (msg: any) => {
            try {
                const doc = await CounterModel.findById(msg.data.id);
                if (!doc) {
                    return parentPort?.postMessage({
                        success: false,
                        error: 'Document not found'
                    });
                }
                doc.value += 1;

                await doc.save();

                parentPort?.postMessage({
                    success: true,
                });
            } catch (err) {
                parentPort?.postMessage({ error: err.message });
            }
        }
    )(msg);
})