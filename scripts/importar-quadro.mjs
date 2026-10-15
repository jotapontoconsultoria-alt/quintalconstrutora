// Carrega no banco o quadro exportado do Supabase (arquivo JSON com { obras, sla, slaAtividades }).
// Uso (dentro do container): node scripts/importar-quadro.mjs /data/quadro-supabase.json
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const arquivo = process.argv[2]
if (!arquivo) { console.error('Informe o arquivo JSON do quadro.'); process.exit(1) }
const dados = JSON.parse(readFileSync(arquivo, 'utf8'))
if (!Array.isArray(dados.obras)) { console.error('Arquivo inválido: falta a lista "obras".'); process.exit(1) }

const dir = process.env.DATA_DIR ?? path.join(process.cwd(), 'data')
const db = new DatabaseSync(path.join(dir, 'quintal.db'))
const existe = db.prepare("select 1 from quadro where id = 'default'").get()
if (existe && process.argv[3] !== '--sobrescrever') {
  console.error('Já existe um quadro neste servidor. Para substituir, acrescente --sobrescrever ao comando.')
  process.exit(1)
}
db.prepare("insert into quadro (id, dados, atualizado_em) values ('default', ?, ?) on conflict (id) do update set dados = excluded.dados, atualizado_em = excluded.atualizado_em")
  .run(JSON.stringify({ obras: dados.obras, sla: dados.sla ?? {}, slaAtividades: dados.slaAtividades ?? {} }), new Date().toISOString())
console.log(`Quadro importado: ${dados.obras.length} obra(s).`)
