import express from 'express'
import { shortenPostRequestBodySchema } from '../validation/request.validation.js'
import { nanoid } from 'nanoid'
import { db } from '../db/index.js'
import { urlsTable } from '../models/index.js'
import { ensureAuthenticated } from '../middleware/auth.middleware.js'
import { createShortUrl } from '../services/url.service.js'
import { asyncHandler, ApiError } from '../middleware/error.middleware.js'
import { and, eq } from 'drizzle-orm'
import {isCodeTaken, recordClick, getStatsForUrl } from '../services/url.service.js'
import { shortenLimiter } from '../middleware/rateLimit.middleware.js'
import { generateQrPng } from '../utils/qrcode.js'
import { getUrlByCode, invalidateUrlCache } from '../services/url.service.js'



const router = express.Router()

router.post('/shorten', shortenLimiter, ensureAuthenticated, asyncHandler(async function (req, res) {

    const validationResult = await shortenPostRequestBodySchema.safeParseAsync(req.body)

    if (!validationResult.success) {
        throw new ApiError(400, validationResult.error.issues[0].message)
    }

    const { url, code, expiresInDays } = validationResult.data;
    const shortCode = code
    if (shortCode) {
        if (await isCodeTaken(shortCode)) {
            throw new ApiError(409, `code "${shortCode}" is already taken`)
        }
    }
         else {
        shortCode = nanoid(6)
    }

    const result = await createShortUrl({
        shortCode,
        url,
        userId: req.user.id,
        expiresInDays
    });


    return res.json(201).json({ id: result.id, shortCode: result.shortcode, targetURL: result.targetURL, expiresAt: result.expiresAt })
})
)

router.get('/codes', ensureAuthenticated, asyncHandler(async function (req, res) {
    const codes = await db.select().from(urlsTable).where(eq(urlsTable.userId, req.user.id))

    return res.json({ codes })
})
)
router.delete('/:id', ensureAuthenticated, asyncHandler(async function (req, res) {
    const id = req.params.id
    const result = await db.delete(urlsTable).where(and(eq(urlsTable.id, id), eq(urlsTable.userId, req.user.id))).returning({ shortCode: urlsTable.shortCode})

    if (deleted) await invalidateUrlCache(deleted.shortCode)


    return res.status(200).json({ deleted: Boolean(deleted) })
})
)

router.get('/codes/:id/stats', ensureAuthenticated, asyncHandler(async function (req, res) {
    const stats = await getStatsForUrl(req.params.id, req.user.id)

    if (!stats) {
        throw new ApiError(404, 'url not found')
    }

    return res.json(stats)
})
)

router.get('/codes/:id/qr', ensureAuthenticated, asyncHandler(async function (req, res) {
    const [url] = await db.select({ shortCode: urlsTable.shortCode })
        .from(urlsTable)
        .where(and(eq(urlsTable.id, req.params.id), eq(urlsTable.userId, req.user.id)))

    if (!url) throw new ApiError(404, 'url not found')

    const fullShortUrl = `${process.env.BASE_URL}/${url.shortCode}`
    const png = await generateQrPng(fullShortUrl)

    res.set('Content-Type', 'image/png')
    return res.send(png)
}))


router.get('/:shortCode', asyncHandler(async function (req, res) {
    const code = req.params.shortCode;
    const result = await getUrlByCode(code)

    if (!result) throw new ApiError(404, 'invalid url')
    if (result.expiresAt && new Date() > new Date(result.expiresAt)) {
        throw new ApiError(410, 'this link has expired')
    }

    recordClick({
        urlId: result.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        referrer: req.headers['referer'] ?? null
    }).catch(err => console.error('failed to record click:', err))

    return res.redirect(result.targetURL);
})
);


export default router