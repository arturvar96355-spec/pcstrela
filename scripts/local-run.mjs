// Локальный запуск: база → водяной знак → начальные данные → сайт.
// База берётся в таком порядке: уже работающая на порту 5432 → Docker → встроенная (ничего ставить не нужно).
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'

const isWin = process.platform === 'win32'
const DB_DIR = '.local-db'

const dbUp = () =>
  new Promise((resolve) => {
    const s = net.connect(5432, '127.0.0.1')
    s.on('connect', () => { s.end(); resolve(true) })
    s.on('error', () => resolve(false))
  })

async function waitDb(seconds = 60) {
  for (let i = 0; i < seconds; i++) {
    if (await dbUp()) return true
    await new Promise((r) => setTimeout(r, 1000))
  }
  return false
}

const run = (cmd, args) => spawnSync(cmd, args, { stdio: 'inherit', shell: isWin })
const dockerWorks = () => spawnSync('docker', ['info'], { stdio: 'ignore', shell: isWin }).status === 0

let embedded = null

async function ensureDb() {
  if (await dbUp()) {
    console.log('База данных уже работает на порту 5432')
    return
  }
  if (dockerWorks()) {
    console.log('Запускаю базу через Docker')
    if (run('docker', ['compose', '-f', 'docker-compose.dev.yml', 'up', '-d']).status === 0 && (await waitDb())) {
      await new Promise((r) => setTimeout(r, 3000))
      return
    }
    console.log('Docker не справился, использую встроенную базу')
  }
  console.log('Запускаю встроенную базу данных (первый раз скачивается около 50 МБ)')
  const { default: EmbeddedPostgres } = await import('embedded-postgres')
  embedded = new EmbeddedPostgres({
    databaseDir: DB_DIR,
    user: 'site',
    password: 'site_dev',
    port: 5432,
    persistent: true,
    onLog: () => {},
    onError: () => {},
  })
  if (!fs.existsSync(`${DB_DIR}/PG_VERSION`)) await embedded.initialise()
  await embedded.start()
  try {
    await embedded.createDatabase('site')
  } catch {
    // база уже создана при прошлом запуске
  }
  if (!(await waitDb(30))) throw new Error('Встроенная база не запустилась')
}

async function stopDb() {
  if (embedded) {
    try {
      await embedded.stop()
    } catch {
      // уже остановлена
    }
  }
}

await ensureDb()

console.log('\n=== Создаю водяной знак и загружаю данные ===')
if (run('pnpm', ['watermark']).status !== 0) { await stopDb(); process.exit(1) }
if (run('pnpm', ['seed']).status !== 0) { await stopDb(); process.exit(1) }

if (process.env.NO_DEV === '1') {
  await stopDb()
  console.log('Готово (режим NO_DEV)')
  process.exit(0)
}

console.log(`
================================================================
  Сайт:     http://localhost:3000
  Админка:  http://localhost:3000/admin
  Вход:     admin@localhost.local  /  admin-local-12345
  Остановить: Ctrl+C
================================================================
`)

const dev = spawn('pnpm', ['dev'], { stdio: 'inherit', shell: isWin })
const shutdown = async () => {
  dev.kill()
  await stopDb()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
dev.on('exit', async (code) => {
  await stopDb()
  process.exit(code ?? 0)
})
