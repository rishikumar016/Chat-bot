import { z } from "zod"

export const signInSchema = z.object({
  email: z.email({ message: "Enter a valid email" }),
  password: z.string().min(1, { message: "Password is required" }),
})

export type SignInValues = z.infer<typeof signInSchema>

export const signUpSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  email: z.email({ message: "Enter a valid email" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" })
    .regex(/[A-Z]/, { message: "Must contain an uppercase letter" })
    .regex(/[a-z]/, { message: "Must contain a lowercase letter" })
    .regex(/\d/, { message: "Must contain a digit" })
    .regex(/[^A-Za-z0-9]/, { message: "Must contain a special character" }),
})

export type SignUpValues = z.infer<typeof signUpSchema>
