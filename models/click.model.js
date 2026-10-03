import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { urlsTable } from './url.model.js';

export const clicksTable = pgTable('clicks', {
    id: uuid().primaryKey().defaultRandom(),

    urlId: uuid('url_id')
        .references(() => urlsTable.id, { onDelete: 'cascade' })
        .notNull(),

    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    referrer: text('referrer'),

    clickedAt: timestamp('clicked_at').defaultNow().notNull(),
});