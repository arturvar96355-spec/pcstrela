// Проверяет, отвечает ли база на порту 5432. С ключом --wait ждёт до 60 секунд.
import net from 'node:net'

const wait = process.argv.includes('--wait')
const probe = () =>
  new Promise((resolve) => {
    const s = net.connect(5432, '127.0.0.1')
    s.on('connect', () => { s.end(); resolve(true) })
    s.on('error', () => resolve(false))
  })

const deadline = Date.now() + (wait ? 60_000 : 0)
do {
  if (await probe()) process.exit(0)
  if (!wait) break
  await new Promise((r) => setTimeout(r, 1000))
} while (Date.now() < deadline)
process.exit(1)
