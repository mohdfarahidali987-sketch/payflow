import {z} from "zod"
export const signupSchema=z.object({
    firstName:z.string().min(3),
    lastName:z.string().min(3),
    username:z.email(),
    password:z.string().min(6)

});
export const signinSchema=z.object({
    username:z.email(),
    password:z.string().min(6)
});
// Kept for backward compatibility; prefer validations/transaction.ts
export { transferSchema } from "./transaction.js";