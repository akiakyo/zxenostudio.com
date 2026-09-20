// Apply only the checked-in additive schema, without creating or resetting accounts.
import { neon } from '@neondatabase/serverless';
import { schemaStatements } from './members.ts';

const url=process.env.DATABASE_URL_UNPOOLED||process.env.DATABASE_URL;
if(!url)throw new Error('Set DATABASE_URL_UNPOOLED to the target database before running this command.');
if(new URL(url).hostname.includes('-pooler'))throw new Error('Use a direct DATABASE_URL_UNPOOLED connection for migrations.');
const sql=neon(url);
for(const statement of schemaStatements())await sql.query(statement);
console.log('Admin schema and HQ migration applied.');
