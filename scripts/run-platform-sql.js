import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.resolve(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const idx = line.indexOf('=')
    if (idx < 0 || line.trimStart().startsWith('#')) continue
    const key = line.slice(0, idx).trim()
    const val = line.slice(idx + 1).trim()
    if (key) process.env[key] = val
  }
}

const sqlFile = process.argv[2]
if (!sqlFile) {
  console.error('Usage: node scripts/run-platform-sql.js <path-to-sql-file>')
  process.exit(1)
}

const sqlPath = path.resolve(process.cwd(), sqlFile)
if (!fs.existsSync(sqlPath)) {
  console.error(`SQL file not found: ${sqlPath}`)
  process.exit(1)
}

function resolveDatabaseUrl() {
  if (process.env.SUPABASE_DB_URL || process.env.DATABASE_URL) {
    return process.env.SUPABASE_DB_URL || process.env.DATABASE_URL
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const password = process.env.SUPABASE_DB_PASSWORD
  if (!supabaseUrl || !password) return null

  const ref = new URL(supabaseUrl).hostname.split('.')[0]
  const region = process.env.SUPABASE_DB_REGION || 'eu-central-1'
  const useDirect = process.env.SUPABASE_DB_DIRECT === 'true'
  const host = process.env.SUPABASE_DB_HOST
    || (useDirect ? `db.${ref}.supabase.co` : `aws-0-${region}.pooler.supabase.com`)
  const port = process.env.SUPABASE_DB_PORT || '5432'
  const user = process.env.SUPABASE_DB_USER
    || (useDirect ? 'postgres' : `postgres.${ref}`)

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/postgres`
}

async function main() {
  const databaseUrl = resolveDatabaseUrl()
  if (!databaseUrl) {
    console.error('Database connection not configured.')
    console.error('Set SUPABASE_DB_URL, DATABASE_URL, or VITE_SUPABASE_URL + SUPABASE_DB_PASSWORD.')
    process.exit(1)
  }

  const sql = fs.readFileSync(sqlPath, 'utf8')
  const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } })

  try {
    await client.connect()
    console.log(`Running ${path.basename(sqlPath)}...`)
    await client.query(sql)
    console.log('Migration completed successfully.')
  } catch (error) {
    console.error('Migration failed:', error.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
