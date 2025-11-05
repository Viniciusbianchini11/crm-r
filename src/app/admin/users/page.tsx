'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  role: 'Owner' | 'Manager' | 'Seller'
  manager_id: string | null
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({
    email: '',
    password: '',
    role: 'Seller' as 'Manager' | 'Seller',
    manager_id: ''
  })
  const [managers, setManagers] = useState<{ id: string; email: string }[]>([])
  const router = useRouter()

  // Verifica se é Owner
  useEffect(() => {
    const checkOwner = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (!data || data.role !== 'Owner') {
        alert('Acesso negado. Apenas o Dono pode acessar esta página.')
        router.push('/dashboard')
        return
      }

      await loadUsers()
      await loadManagers()
    }

    checkOwner()
  }, [router])

  // Carrega todos os usuários
  const loadUsers = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select(`
        id,
        role,
        manager_id,
        user:auth.users (email)
      `)
      .order('created_at', { ascending: false })

    const formatted: User[] = (data || []).map((p: any) => ({
      id: p.id,
      email: p.user?.email || 'Sem email',
      role: p.role,
      manager_id: p.manager_id
    }))

    console.log('Usuários carregados:', formatted) // Debug
    setUsers(formatted)
    setLoading(false)
  }

  // Carrega apenas gerentes
  const loadManagers = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const res = await fetch('/api/admin/list-managers', {
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    })

    if (!res.ok) {
      console.error('Falha ao carregar gerentes')
      setManagers([])
      return
    }

    const result = await res.json()
    setManagers(result.managers || [])
  }

  // Cria usuário via API
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email || !form.password) {
      alert('Preencha email e senha')
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      alert('Sessão expirada')
      return
    }

    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        email: form.email,
        password: form.password,
        role: form.role,
        manager_id: form.role === 'Seller' ? form.manager_id || null : null
      })
    })

    const result = await res.json()

    if (result.error) {
      alert('Erro: ' + result.error)
    } else {
      alert('Usuário criado e perfil salvo!')
      setForm({ email: '', password: '', role: 'Seller', manager_id: '' })
      await loadUsers() // Recarrega usuários
      await loadManagers() // Recarrega gerentes imediatamente
    }
  }

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-gray-300 text-lg">Carregando...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-light text-gray-100 mb-1">Gerenciar Usuários</h1>
            <p className="text-gray-400 text-sm">Crie e gerencie usuários do sistema</p>
          </div>
          <button
            onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
            className="px-6 py-2.5 bg-gray-800 text-gray-200 rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            Sair
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Formulário */}
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
            <h2 className="text-xl font-medium mb-6 text-gray-100">Criar Novo Usuário</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  placeholder="usuario@exemplo.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Senha</label>
                <input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors"
                  required
                  minLength={6}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Cargo</label>
                <select
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value as any, manager_id: '' })}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:border-gray-600 transition-colors"
                >
                  <option value="Seller">Vendedor</option>
                  <option value="Manager">Gerente</option>
                </select>
              </div>

              {form.role === 'Seller' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Gerente</label>
                  <select
                    value={form.manager_id}
                    onChange={e => setForm({ ...form, manager_id: e.target.value })}
                    className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:border-gray-600 transition-colors"
                  >
                    <option value="">Sem gerente</option>
                    {managers.map(m => (
                      <option key={m.id} value={m.id}>{m.email}</option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gray-100 text-black p-3 rounded-lg font-medium hover:bg-gray-200 transition-colors mt-6"
              >
                Criar Usuário
              </button>
            </form>
          </div>

          {/* Lista de usuários */}
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
            <h2 className="text-xl font-medium mb-6 text-gray-100">Todos os Usuários</h2>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Buscar por email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors"
              />
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filteredUsers.map(user => (
                <div key={user.id} className="p-4 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700/50 transition-colors">
                  <p className="font-medium text-gray-100 mb-1">{user.email}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>
                      <span className="text-gray-500">Cargo:</span> {user.role}
                    </span>
                    {user.manager_id && (
                      <span>
                        <span className="text-gray-500">Gerente:</span> {managers.find(m => m.id === user.manager_id)?.email || 'Desconhecido'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">Nenhum usuário encontrado</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}