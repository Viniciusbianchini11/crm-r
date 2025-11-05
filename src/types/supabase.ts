// Tipos manuais — você controla tudo
export type UserRole = 'Owner' | 'Manager' | 'Seller'

export interface Profile {
  id: string
  role: UserRole
  manager_id: string | null
  created_at?: string
  updated_at?: string
}

export interface Contact {
  id: string
  user_id: string
  name: string
  email: string
  phone?: string
}