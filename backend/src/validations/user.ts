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
export const transferSchema=z.object({
    to:z.string(),
    amount:z.number().positive()
})