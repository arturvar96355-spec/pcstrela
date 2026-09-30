import type { Access, FieldAccess } from 'payload'

type Role = 'admin' | 'editor'
const roleOf = (user: unknown): Role | undefined => (user as { role?: Role } | null)?.role

export const anyone: Access = () => true
export const isAdmin: Access = ({ req: { user } }) => roleOf(user) === 'admin'
export const isEditorOrAdmin: Access = ({ req: { user } }) =>
  roleOf(user) === 'admin' || roleOf(user) === 'editor'
export const publishedOrLoggedIn: Access = ({ req: { user } }) =>
  user ? true : { _status: { equals: 'published' } }
export const nobody: Access = () => false

export const isAdminField: FieldAccess = ({ req: { user } }) => roleOf(user) === 'admin'
export const isLoggedInField: FieldAccess = ({ req: { user } }) => Boolean(user)
