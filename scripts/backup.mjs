// Cópia consistente do banco (mesmo com o site em uso). Uso: node scripts/backup.mjs
import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'

const dir = process.env.DATA_DIR ?? path.join(process.cwd(), 'data')
const pasta = path.join(dir, 'backups')
mkdirSync(pasta, { recursive: true })
const destino = path.join(pasta, 'quintal.db')
rmSync(destino, { force: true })
new DatabaseSync(path.join(dir, 'quintal.db')).exec(`vacuum into '${destino.replace(/'/g, "''")}'`)
console.log('Backup do banco criado em', destino)
