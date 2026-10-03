import express from 'express'
import { db } from '../db/index.js'
import { usersTable } from '../models/index.js'
import { signupPostRequestBodySchema, loginPostRequestBodySchema } from '../validation/request.validation.js'
import { hashPasswordWithSalt } from '../utils/hash.js'
import { getUserByEmail, createUser } from '../services/user.service.js'
import { createUserToken } from '../utils/token.js'
import { asyncHandler } from '../middleware/error.middleware.js'
import { authLimiter } from '../middleware/rateLimit.middleware.js'



const router = express.Router()

router.post('/signup', asyncHandler(async (req, res) => {
    const validationResult = await signupPostRequestBodySchema.safeParseAsync(req.body)

    if (!validationResult.success) {
        throw new ApiError(400, validationResult.error.issues[0].message)
    }

    const { firstname, lastname, email, password } = validationResult.data

    const existingUser = await getUserByEmail(email)

    if (existingUser) {
        throw new ApiError(400, `user with email ${email} already exists!`)
    }

    const { salt, password: hash } = hashPasswordWithSalt(password)

    const user = await createUser(email, firstname, lastname, salt, password)

    return res.status(201).json({ data: { userId: user.id } })
})
);

router.post('/login', authLimiter, asyncHandler(async (req, res) => {
    const validationResult = await loginPostRequestBodySchema.safeParseAsync(req.body)

    if (!validationResult.success) {
        throw new ApiError(400, validationResult.error.issues[0].message)
    }

    const { email, password } = validationResult.data
    const user = await getUserByEmail(email)

    if (!user) {
        throw new ApiError(400, 'invalid email or password')
    }

    const { password: hashedPassword } = hashPasswordWithSalt(password, user.salt)

    if (user.password !== hashedPassword) {
        throw new ApiError(400, 'invalid email or password')
    }

    const token = await createUserToken({ id: user.id })

    return res.json({ token })
})
)
export default router;