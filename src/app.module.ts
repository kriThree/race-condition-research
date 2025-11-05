import { Module } from '@nestjs/common';
import mongoose from 'mongoose';
import { CounterModel } from './counter/counter.schema';
import { CounterModule } from './counter/counter.module';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './config/logger.config';

@Module({

  providers: [
    {
      provide: 'DATABASE_CONNECTION',
      useFactory: (): Promise<typeof mongoose> =>
        mongoose.connect(
          process.env.MONGODB_URI || '',
        )
    }
  ],
  imports: [
    CounterModule,
    WinstonModule.forRoot(winstonConfig), 
    ConfigModule.forRoot({
      isGlobal: true,
    }),],
})
export class AppModule { }
