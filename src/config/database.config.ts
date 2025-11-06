import mongoose from "mongoose"

export const dbInit = (str: string): Promise<typeof mongoose> => {
    console.log(str)
    return mongoose.connect(
        str,
    )
}