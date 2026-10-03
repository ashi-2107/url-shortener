import 'dotenv/config'
import express from 'express'
import userRouter from './routes/user.routes.js'
import urlRouter from './routes/url.routes.js'
import {authenticationMiddleware} from './middleware/auth.middleware.js'
import { notFoundHandler, errorHandler } from './middleware/error.middleware.js'


const app = express()
const Port = process.env.Port ?? 8000

app.set('trust proxy', 1)
app.use(express.json())
app.use(authenticationMiddleware)

app.use('/user', userRouter)
app.use(urlRouter)

app.get('/', (req, res) => {
    res.json({status:'Server is up and running...'})
})

app.use(notFoundHandler)
app.use(errorHandler)

app.listen(Port, () => {
    console.log(`server is running on port ${Port}`)
})
