// Создаёт public/watermark.png из WATERMARK_TEXT. Когда будет логотип — просто замените PNG.
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const text = (process.env.WATERMARK_TEXT ?? 'ПК Стрела').replace(/[<>&]/g, '')
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="300">
  <text x="600" y="190" font-family="DejaVu Sans, Arial, sans-serif" font-weight="700" font-size="150"
        text-anchor="middle" fill="rgba(255,255,255,0.22)" stroke="rgba(0,0,0,0.12)" stroke-width="3">${text}</text>
</svg>`

const out = path.join(process.cwd(), 'public', 'watermark.png')
fs.mkdirSync(path.dirname(out), { recursive: true })
await sharp(Buffer.from(svg)).png().toFile(out)
console.log('watermark written:', out)

// картинка для превью ссылок в соцсетях и мессенджерах
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#111"/>
  <text x="80" y="340" font-family="DejaVu Sans, Arial, sans-serif" font-weight="700" font-size="96" fill="#fff">${text}</text>
  <text x="80" y="420" font-family="DejaVu Sans, Arial, sans-serif" font-size="36" fill="#bbb">Металлоконструкции, МАФ и инженерные системы</text>
</svg>`
await sharp(Buffer.from(og)).png().toFile(path.join(process.cwd(), 'public', 'og-default.png'))
console.log('og-default written')
