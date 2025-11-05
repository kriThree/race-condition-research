import { Inject, Injectable, LoggerService } from "@nestjs/common";
import { WorkerManager } from "src/workers/worker.manager";
import { CounterModel } from "./counter.schema";
import cluster from "cluster";
import path from "path";
import { TestRaceDto } from "./dto/counter.dto";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { INFO_LEVEL } from "src/config/logger.config";


@Injectable()

export class CounterService {
    constructor(
        @Inject(WINSTON_MODULE_NEST_PROVIDER)
        private readonly logger: Logger
    ) {

    }

    async increment() {
        await CounterModel.updateOne({ _id: "690a983797044ff4ddd56cbd" }, { $inc: { value: 1 } });

        this.logger.log(INFO_LEVEL, `успешная инкрементация`)

    }
    async get(): Promise<number> {
        this.logger.log(INFO_LEVEL, "Получение значения счетчика")
        
        return (await CounterModel.findOne({}))?.value ?? 0;

    }
    async reset() {
        this.logger.log(INFO_LEVEL, "Сброс счетчика")

        return await CounterModel.updateOne({ _id: "690a983797044ff4ddd56cbd" }, { $set: { value: 0 } });
    }
    async testRace(): Promise<TestRaceDto> {
        this.logger.log("info", "Начало тестирования инкерментаций worker-ов")

        const withoutProtectValue = await this.testRaceWithoutProtect();
        const atomicValue = await this.testAtomic();
        const optimisticValue = await this.testOptimistic();

        return new TestRaceDto(withoutProtectValue, atomicValue, optimisticValue)

    }

    async testRaceWithoutProtect(): Promise<number> {
        this.logger.log(INFO_LEVEL, "Начало тестирования инкерментации worker-ов без защиты")
      
        await this.reset();

        const worker = new WorkerManager(
            "C:/Users/kriThree/Desktop/projects/test/race-condition/race/src/counter/increments/increment.race.ts",
            process.env.MONGODB_URI,
            3,
            this.logger
        );
        await worker.connect()

        const startTime = Date.now();
        const tasks: Promise<any>[] = [];
        for (let i = 0; i < 1000; i++) {
            const taskPromise = worker.runTask({ id: "690a983797044ff4ddd56cbd" })
            tasks.push(taskPromise);
        }

        try {
            await Promise.all(tasks);
        } catch (error) {
            console.error('Some tasks failed:', error);
        }

        const finalDoc = await this.get();
        await worker.destroy();
        await this.reset();

        return finalDoc

    }

    async testAtomic(): Promise<number> {
        await this.reset();

        const worker = new WorkerManager(
            "C:/Users/kriThree/Desktop/projects/test/race-condition/race/src/counter/increments/increment.atomic.ts",
            process.env.MONGODB_URI,
            3,
            this.logger
        );
        await worker.connect()

        const startTime = Date.now();
        const tasks: Promise<any>[] = [];
        for (let i = 0; i < 1000; i++) {
            const taskPromise = worker.runTask({ id: "690a983797044ff4ddd56cbd" })
            tasks.push(taskPromise);
        }

        try {
            await Promise.all(tasks);
        } catch (error) {
            console.error('Some tasks failed:', error);
        }

        const finalDoc = await this.get();
        await worker.destroy();
        await this.reset();

        return finalDoc
    }
    async testOptimistic(): Promise<number> {

        await this.reset();

        const worker = new WorkerManager(
            "C:/Users/kriThree/Desktop/projects/test/race-condition/race/src/counter/increments/increment.optimistic.ts",
            process.env.MONGODB_URI,
            3,
            this.logger
        );
        await worker.connect()
        const startTime = Date.now();
        const tasks: Promise<any>[] = [];
        for (let i = 0; i < 1000; i++) {
            const taskPromise = worker.runTask({ id: "690a983797044ff4ddd56cbd" })
            if (i % 100 === 0) console.log(i)
            tasks.push(taskPromise);
        }
        try {
            await Promise.all(tasks);
        } catch (error) {
            console.log(error)
        }
        const finalDoc = await this.get();
        await worker.destroy();
        await this.reset();

        return finalDoc
    }
}

