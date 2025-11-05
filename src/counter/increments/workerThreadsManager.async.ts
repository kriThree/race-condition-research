import { parentPort, workerData } from "worker_threads";
import { CounterModel } from "../counter.schema";

import mongoose from "mongoose";

let isConnected = false;


export const msgWrapper = (callback : (msg: any) => void) => {
    return async (msg: any) => {
        if (msg.type === 'exit') {
            await mongoose.connection.close();
            process.exit(0);
        } else if (msg.type === 'connect') {
            console.log(`Worker ${process.pid}: Connecting to MongoDB`);
            try {
                await mongoose.connect(workerData.mongoUri, {
                    maxPoolSize: 3,
                    minPoolSize: 1,
                });
                mongoose.connection.on('connected', () => {
                    console.log(`Worker ${process.pid}: Connected to MongoDB`);
                });

                mongoose.connection.on('disconnected', () => {
                    console.log(`Worker ${process.pid}: Disconnected from MongoDB`);
                });

                mongoose.connection.on('error', (err) => {
                    console.error(`Worker ${process.pid}: MongoDB error:`, err);
                });

                // Сообщаем, что воркер готов
                console.log("a")
                parentPort?.postMessage({ type: 'ready' });
            } catch (err) {
                console.error('Worker: MongoDB connection failed:', err);
                process.exit(1);
            }
        } else if (msg.type === 'task') {
            callback(msg)
        }
    }
}

process.on('SIGTERM', async () => {
    if (isConnected) {
        await mongoose.connection.close();
    }
    process.exit(0);
});
