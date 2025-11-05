import { Controller, Get, Post } from "@nestjs/common";
import { CounterService } from "./counter.service";
import {
  ApiTags,

} from '@nestjs/swagger';

@ApiTags('counter')
@Controller('counter')
export class CounterController {
    constructor(
        private CounterService : CounterService
    ){}

    @Post("/increment")
    async increment() {
        return await this.CounterService.increment();
    }
    @Get("/")
    async get() {
        return await this.CounterService.get();
    }
    @Post("/reset")
    async reset() {
        return await this.CounterService.reset();
    }
    @Post("/test-race")
    async testRace() {
        return await this.CounterService.testRace();
    }
}