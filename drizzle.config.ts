import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/storage/database/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: '.zettelscript/zettelscript.db',
  },
});
