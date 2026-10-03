
import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({path: './.env'});

export default defineConfig({
    out: './drizzle',
    schema: './models/index.js',
    dialect: 'postgresql',
    dbCredentials: {
        url: 'postgresql://postgres:admin@localhost:5433/postgres',
    },
});
