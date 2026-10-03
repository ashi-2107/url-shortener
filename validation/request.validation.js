import { z } from 'zod'

export const signupPostRequestBodySchema = z.object({
    firstname: z.string(),
    lastname: z.string().optional(),
    email: z.string().email(),
    password: z.string().min(3),
})

export const loginPostRequestBodySchema = z.object({
    email: z.string().email(),
    password: z.string().min(3),
})

export const shortenPostRequestBodySchema = z.object({
    url: z.string().url(),
    code: z.string()
        .min(3, 'alias must be at least 3 characters')
        .max(30, 'alias must be under 30 characters')
        .regex(/^[a-zA-Z0-9_-]+$/, 'alias can only contain letters, numbers, _ and -')
        .optional(),
    expiresInDays: z.coerce.number()
        .int()
        .positive()
        .max(365, 'max expiry is 365 days')
        .optional(),
})