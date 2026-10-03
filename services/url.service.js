import { db } from '../db/index.js';
import { urlsTable } from '../models/url.model.js';
import { eq } from 'drizzle-orm';
import { clicksTable } from '../models/click.model.js';
import { desc, sql } from 'drizzle-orm';
import { redis } from '../db/redis.js'

const CACHE_TTL_SECONDS = 60 * 60 // 1 hour

export async function getUrlByCode(shortCode) {
    const cacheKey = `url:${shortCode}`
    const cached = await redis.get(cacheKey)
    if (cached) return JSON.parse(cached)

    const [result] = await db.select({
        id: urlsTable.id,
        targetURL: urlsTable.targetURL,
        expiresAt: urlsTable.expiresAt
    }).from(urlsTable).where(eq(urlsTable.shortCode, shortCode))

    if (result) {
        await redis.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL_SECONDS)
    }

    return result
}

export async function invalidateUrlCache(shortCode) {
    await redis.del(`url:${shortCode}`)
}

export async function recordClick({ urlId, ipAddress, userAgent, referrer }) {
    await db.insert(clicksTable).values({ urlId, ipAddress, userAgent, referrer });
}

export async function getStatsForUrl(urlId, userId) {
    const [url] = await db.select()
        .from(urlsTable)
        .where(and(eq(urlsTable.id, urlId), eq(urlsTable.userId, userId)));

    if (!url) return null;

    const [{ totalClicks }] = await db.select({ totalClicks: sql`count(*)::int` })
        .from(clicksTable)
        .where(eq(clicksTable.urlId, urlId));

    const recentClicks = await db.select({
        ipAddress: clicksTable.ipAddress,
        userAgent: clicksTable.userAgent,
        referrer: clicksTable.referrer,
        clickedAt: clicksTable.clickedAt,
    })
        .from(clicksTable)
        .where(eq(clicksTable.urlId, urlId))
        .orderBy(desc(clicksTable.clickedAt))
        .limit(10);

    return { url, totalClicks, recentClicks };
}



export async function isCodeTaken(shortCode) {
    const [existing] = await db.select({ id: urlsTable.id })
        .from(urlsTable)
        .where(eq(urlsTable.shortCode, shortCode));
    return Boolean(existing);
}

export async function createShortUrl({ shortcode, url, userId }) {
    const expiresAt = expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
        : null;
    const [result] = await db
        .insert(urlsTable)
        .values({
            shortcode,
            targetURL: url,
            userId
        })
        .returning({
            id: urlsTable.id,
            shortcode: urlsTable.shortCode,
            targetURL: urlsTable.targetURL
        });

    return result;
}