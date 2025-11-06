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
        await CounterModel.updateOne({ _id: process.env.COUNTER_ID }, { $inc: { value: 1 } });

        this.logger.log(INFO_LEVEL, `успешная инкрементация`)

    }
    async get(): Promise<number> {
        this.logger.log(INFO_LEVEL, "Получение значения счетчика")

        return (await CounterModel.findOne({}))?.value ?? 0;

    }
    async reset() {
        this.logger.log(INFO_LEVEL, "Сброс счетчика")

        return await CounterModel.updateOne({ _id: process.env.COUNTER_ID }, { $set: { value: 0 } });
    }
    async testRace(): Promise<TestRaceDto> {
        this.logger.log(INFO_LEVEL, "Начало тестирования инкерментаций worker-ов")

        this.logger.log(INFO_LEVEL, "Начало тестирования инкерментации worker-ов без защиты")
        const withoutProtectValue = await this.testTemplate("C:/Users/kriThree/Desktop/projects/test/race-condition/race/src/counter/increments/increment.race.ts");
        this.logger.log(INFO_LEVEL, "Начало тестирования инкерментации worker-ов с атомарными операциями")
        const atomicValue = await this.testTemplate("C:/Users/kriThree/Desktop/projects/test/race-condition/race/src/counter/increments/increment.atomic.ts");
        this.logger.log(INFO_LEVEL, "Начало тестирования инкерментации worker-ов с оптимистичными операциями")
        const optimisticValue = await this.testTemplate("C:/Users/kriThree/Desktop/projects/test/race-condition/race/src/counter/increments/increment.optimistic.ts");
        this.logger.log(INFO_LEVEL, "Конец тестирования инкерментации worker-ов с пессимистичными операциями")
        const pesimisticValue = await this.testTemplate("C:/Users/kriThree/Desktop/projects/test/race-condition/race/src/counter/increments/increment.pesimistic.ts");


        return new TestRaceDto(withoutProtectValue, atomicValue, optimisticValue, pesimisticValue);

    }

    async testTemplate(path: string): Promise<number> {

        await this.reset();

        const manager = new WorkerManager(
            path,
            process.env.MONGODB_URI,
            3,
            this.logger,
            true
        );
        this.logger.log(INFO_LEVEL, "Создание worker-ов")
        await manager.connect()

        this.logger.log(INFO_LEVEL, "Запуск задач")
        const startTime = Date.now();

        const tasks: Promise<any>[] = [];
        for (let i = 0; i < 1000; i++) {
            const taskPromise = manager.runTask({ id: process.env.COUNTER_ID })
            tasks.push(taskPromise);
        }
        try {
            await Promise.all(tasks);
        } catch (error) {
            console.error('Some tasks failed:', error);
        }

        const duration = Date.now() - startTime;

        this.logger.log(INFO_LEVEL, `Время выполнения: ${duration} ms`);

        const finalDoc = await this.get();

        manager.tasksStats.forEach((value, key) => {
            this.logger.log(INFO_LEVEL, `worker ${key} инкрементов: ${value}`)
        })
        if (manager.meta){
            this.logger.log(INFO_LEVEL, `количество повторных попыток: ${manager.meta.retryCount}`)
        }

        this.logger.log(INFO_LEVEL, `Итог инкрементации ${finalDoc}` )

        this.logger.log(INFO_LEVEL, `Процент потерь при работе воркеров ${100 - finalDoc / 1000 * 100}%`, )


        await manager.destroy();
        await this.reset();

        return finalDoc
    }

}

