// Создаёт или обновляет администратора сайта (при передаче сайта заказчику) и при желании удаляет прежнего.
// Запуск на сервере (пароль вводится скрытно, в историю команд не попадает):
//   read -p "Email нового админа: " NEW_ADMIN_EMAIL; read -s -p "Пароль (от 12 символов): " NEW_ADMIN_PASSWORD; echo
//   export NEW_ADMIN_EMAIL NEW_ADMIN_PASSWORD
//   docker compose --profile tools run --rm -e NEW_ADMIN_EMAIL -e NEW_ADMIN_PASSWORD seed pnpm tsx scripts/set-admin.ts
// Чтобы удалить прежнего админа: добавьте -e REMOVE_ADMIN_EMAIL=адрес (export REMOVE_ADMIN_EMAIL=адрес).
import { getPayload } from 'payload'
import config from '../src/payload.config'

const email = process.env.NEW_ADMIN_EMAIL?.trim().toLowerCase()
const password = process.env.NEW_ADMIN_PASSWORD
const remove = process.env.REMOVE_ADMIN_EMAIL?.trim().toLowerCase()
if (!email || !password) throw new Error('Нужны NEW_ADMIN_EMAIL и NEW_ADMIN_PASSWORD')
if (password.length < 12) throw new Error('Пароль должен быть не короче 12 символов')

const payload = await getPayload({ config })
const found = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1, overrideAccess: true })
const user = found.docs[0]
if (user) {
  await payload.update({ collection: 'users', id: user.id, data: { password, role: 'admin', loginAttempts: 0, lockUntil: null } as never, overrideAccess: true })
  console.log(`[set-admin] пароль обновлён: ${email}`)
} else {
  await payload.create({ collection: 'users', data: { email, password, name: 'Администратор', role: 'admin' } as never, overrideAccess: true })
  console.log(`[set-admin] создан администратор: ${email}`)
}

if (remove && remove !== email) {
  const old = await payload.find({ collection: 'users', where: { email: { equals: remove } }, limit: 1, overrideAccess: true })
  if (old.docs[0]) {
    await payload.delete({ collection: 'users', id: old.docs[0].id, overrideAccess: true })
    console.log(`[set-admin] удалён пользователь: ${remove}`)
  } else {
    console.log(`[set-admin] пользователь ${remove} не найден`)
  }
}
process.exit(0)
