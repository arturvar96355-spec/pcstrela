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
