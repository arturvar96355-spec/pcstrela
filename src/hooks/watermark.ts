import path from 'node:path'
import sharp from 'sharp'
import { APIError, type CollectionBeforeOperationHook } from 'payload'

const WATERMARK = path.join(process.cwd(), 'public', 'watermark.png')

export async function applyWatermark(input: Buffer): Promise<Buffer> {
  const base = sharp(input).rotate() // учитываем EXIF-ориентацию фото с телефона
  const { width = 1600 } = await base.metadata()
  if (width < 800) throw new APIError('Фото слишком маленькое: нужно не меньше 800 px по ширине', 400)
  const mark = await sharp(WATERMARK)
    .resize({ width: Math.round(width * 0.35) })
    .toBuffer()
  return base.composite([{ input: mark, gravity: 'center' }]).toBuffer()
}

// Водяной знак вшивается до генерации imageSizes, поэтому он есть во всех размерах.
export const watermarkBeforeOperation: CollectionBeforeOperationHook = async ({ args, operation, req }) => {
  const file = req.file
  if ((operation === 'create' || operation === 'update') && file?.data && file.mimetype?.startsWith('image/')) {
    file.data = await applyWatermark(file.data)
    file.size = file.data.length
  }
  return args
}
