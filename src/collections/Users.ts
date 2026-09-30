import { APIError, type CollectionConfig } from 'payload'
import { isAdmin, isAdminField, isEditorOrAdmin } from '../access'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Пользователь', plural: 'Пользователи' },
  auth: {
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000, // 15 минут блокировки после 5 неудачных попыток
    tokenExpiration: 8 * 60 * 60, // 8 часов
    cookies: { secure: process.env.NODE_ENV === 'production', sameSite: 'Lax' },
  },
  admin: { useAsTitle: 'email', group: 'Система', defaultColumns: ['email', 'name', 'role'] },
  access: {
    admin: ({ req: { user } }) => {
      const role = (user as { role?: string } | null)?.role
      return role === 'admin' || role === 'editor'
    },
    read: isEditorOrAdmin,
    create: isAdmin,
    update: ({ req: { user }, id }) =>
      (user as { role?: string } | null)?.role === 'admin' || (user ? user.id === id : false),
    delete: isAdmin,
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        const password = (data as { password?: unknown } | undefined)?.password
        if (typeof password === 'string' && password.length > 0 && password.length < 12) {
          throw new APIError('Пароль должен быть не короче 12 символов', 400)
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'name', label: 'Имя', type: 'text', required: true, maxLength: 80 },
    {
      name: 'role',
      label: 'Роль',
      type: 'select',
      required: true,
      defaultValue: 'editor',
      saveToJWT: true,
      options: [
        { label: 'Администратор', value: 'admin' },
        { label: 'Редактор', value: 'editor' },
      ],
      access: { create: isAdminField, update: isAdminField },
    },
  ],
}
