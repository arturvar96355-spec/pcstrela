import type { GlobalConfig } from 'payload'
import { anyone, isAdmin, isLoggedInField } from '../access'
import { revalidateGlobal, EVERYTHING } from '../hooks/revalidate'
import { isValidInn, normalizeRuPhone } from '../lib/validators'

// Единственный источник контактов, реквизитов и цифр компании.
export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Настройки сайта',
  admin: { group: 'Система' },
  access: { read: anyone, update: isAdmin },
  hooks: { afterChange: [revalidateGlobal(EVERYTHING)] },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Компания',
          fields: [
            { name: 'companyName', label: 'Название (как на сайте)', type: 'text', required: true, maxLength: 60 },
            { name: 'tagline', label: 'Подпись к логотипу', type: 'text', maxLength: 80 },
            { name: 'logo', label: 'Логотип (PNG)', type: 'upload', relationTo: 'media' },
            {
              name: 'facts',
              label: 'Цифры компании',
              type: 'array',
              maxRows: 4,
              fields: [
                { name: 'value', label: 'Значение', type: 'text', required: true, maxLength: 12 },
                { name: 'label', label: 'Подпись', type: 'text', required: true, maxLength: 50 },
              ],
            },
            {
              name: 'warrantyShort',
              label: 'Гарантия одной строкой',
              type: 'text',
              maxLength: 120,
              admin: {
                description: 'Показывается на главной, в карточках и на странице «Гарантия». Писать только здесь.',
              },
            },
            {
              name: 'responseTimePromise',
              label: 'Обещание времени ответа',
              type: 'text',
              maxLength: 100,
              defaultValue: 'Ответим в рабочее время в течение 1 часа',
            },
            { name: 'catalogPdf', label: 'PDF-каталог', type: 'upload', relationTo: 'files' },
            { name: 'companyCardFile', label: 'Карточка предприятия (PDF)', type: 'upload', relationTo: 'files' },
            {
              name: 'gispNote',
              label: 'Текст о реестре Минпромторга',
              type: 'textarea',
              maxLength: 300,
              admin: { description: 'Оставьте пустым, если продукции нет в реестре — блок не будет показан' },
            },
          ],
        },
        {
          label: 'Контакты',
          fields: [
            {
              name: 'phones',
              label: 'Телефоны',
              type: 'array',
              minRows: 1,
              maxRows: 4,
              fields: [
                {
                  name: 'number',
                  label: 'Номер',
                  type: 'text',
                  required: true,
                  validate: (v: unknown) =>
                    normalizeRuPhone(String(v ?? '')) ? true : 'Формат: +7 985 975-03-50',
                },
                { name: 'label', label: 'Подпись', type: 'text', maxLength: 40 },
                { name: 'primary', label: 'Основной (в шапке)', type: 'checkbox', defaultValue: false },
              ],
            },
            {
              name: 'emails',
              label: 'Email',
              type: 'array',
              maxRows: 3,
              fields: [
                { name: 'email', type: 'email', required: true },
                { name: 'label', type: 'text', maxLength: 40 },
              ],
            },
            { name: 'telegramUrl', label: 'Telegram (https://t.me/...)', type: 'text' },
            {
              name: 'whatsappUrl',
              label: 'WhatsApp (https://wa.me/...)',
              type: 'text',
              admin: { description: 'Не рекомендуется: сервис ограничен в РФ. Если пусто — кнопка не показывается.' },
            },
            { name: 'workingHours', label: 'Режим работы', type: 'text', defaultValue: 'пн–пт 9:00–18:00', maxLength: 60 },
            { name: 'productionAddress', label: 'Фактический адрес производства', type: 'text', maxLength: 200 },
            {
              type: 'row',
              fields: [
                { name: 'lat', label: 'Широта', type: 'number', min: 41, max: 82 },
                { name: 'lng', label: 'Долгота', type: 'number', min: 19, max: 180 },
              ],
            },
          ],
        },
        {
          label: 'Реквизиты',
          fields: [
            { name: 'legalName', label: 'Полное наименование', type: 'text', maxLength: 200 },
            {
              type: 'row',
              fields: [
                {
                  name: 'inn',
                  label: 'ИНН',
                  type: 'text',
                  validate: (v: unknown) => (!v || isValidInn(String(v)) ? true : 'Неверный ИНН'),
                },
                {
                  name: 'kpp',
                  label: 'КПП',
                  type: 'text',
                  validate: (v: unknown) => (!v || /^\d{9}$/.test(String(v)) ? true : '9 цифр'),
                },
                {
                  name: 'ogrn',
                  label: 'ОГРН / ОГРНИП',
                  type: 'text',
                  validate: (v: unknown) => (!v || /^\d{13}$|^\d{15}$/.test(String(v)) ? true : '13 или 15 цифр'),
                },
              ],
            },
            { name: 'legalAddress', label: 'Юридический адрес', type: 'text', maxLength: 250 },
            { name: 'bankDetails', label: 'Банковские реквизиты', type: 'textarea', maxLength: 600 },
          ],
        },
        {
          label: 'Уведомления',
          fields: [
            {
              name: 'notifyEmails',
              label: 'Email для заявок',
              type: 'array',
              maxRows: 5,
              access: { read: isLoggedInField },
              fields: [{ name: 'email', type: 'email', required: true }],
            },
            {
              name: 'telegramChatIds',
              label: 'Telegram chat_id',
              type: 'array',
              maxRows: 5,
              access: { read: isLoggedInField },
              fields: [{ name: 'chatId', type: 'text', required: true }],
            },
          ],
        },
        {
          label: 'Аналитика',
          fields: [
            {
              name: 'metrikaId',
              label: 'ID счётчика Яндекс Метрики',
              type: 'text',
              validate: (v: unknown) => (!v || /^\d{6,10}$/.test(String(v)) ? true : 'Только цифры'),
            },
            { name: 'yandexVerification', label: 'Код подтверждения Яндекс Вебмастера', type: 'text' },
          ],
        },
      ],
    },
  ],
}
