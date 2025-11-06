import { model, Schema } from 'mongoose';

export const CounterSchema = new Schema(
    {
        name: {
            type: String,
            required: true
        },
        value: {
            type: Number,
            required: true
        },
        version: {
            type: Number,
            required: true
        },// Для кейса с optimistic lock
        updatedAt: {
            type: Date,
            required: true
        },

        isLocked: {
            type: Boolean,
            default: true
        }, // Для кейса с pessimisitc lock
        lockedAt: {
            type : Date,
            default: null,
            required: false 
        }
    }
)

export class Counter {
    name: string;
    value: number;
    version: number;
    updatedAt: Date;

}

export const CounterModel = model<Counter>('counter', CounterSchema, 'counters'); 