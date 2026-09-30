import type { CollectionConfig } from 'payload'
import { Media } from './Media'
import { watermarkBeforeOperation } from '../hooks/watermark'

export const ProductImages: CollectionConfig = {
  ...Media,
  slug: 'product-images',
  labels: { singular: 'Фото товара', plural: 'Фото товаров' },
  upload: { ...(Media.upload as object), staticDir: 'media/products' },
  hooks: { beforeOperation: [watermarkBeforeOperation] },
}
