'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Contact {
  id: string
  name: string
  email: string | null
  phone: string | null
  user_id: string
  manager_id: string | null
  user_email?: string
  manager_email?: string
  created_at: string
}

interface UserOption {
  id: string
  email: string
  role: string
}

export default function AdminContacts() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', user_id: '', manager_id: '' })
  const router = useRouter()

  useEffect(() => {
    const checkAndLoad = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (profile?.role !== 'Owner') {
        alert('Acesso negado.')
        router.push('/dashboard')
        return
      }

      await Promise.all([
        loadContacts(session.access_token),
        loadAllUsers(session.access_token)
      ])
    }

    checkAndLoad()
  }, [router])

  const loadAllUsers = async (token: string) => {
    const res = await fetch('/api/admin/list-all-users', {
      headers: { Authorization: `Bearer ${token}` }
    })
    const { users } = await res.json()
    setUsers(users || [])
  }

  const loadContacts = async (token: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/contacts/list', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!res.ok) throw new Error('Falha ao carregar')

      const { contacts } = await res.json()

      const enriched = await Promise.all(
        contacts.map(async (c: Contact) => {
          const [userRes, managerRes] = await Promise.all([
            fetch(`/api/contacts/user-email?user_id=${c.user_id}`),
            c.manager_id ? fetch(`/api/contacts/user-email?user_id=${c.manager_id}`) : null
          ])
          const userData = await userRes.json()
          const managerData = managerRes ? await managerRes.json() : null
          c.user_email = userData.email
          c.manager_email = managerData?.email || null
          return c
        })
      )

      setContacts(enriched)
    } catch (err) {
      alert('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  const openEdit = (contact: Contact) => {
    setEditingId(contact.id)
    setForm({
      name: contact.name,
      email: contact.email || '',
      phone: contact.phone || '',
      user_id: contact.user_id,
      manager_id: contact.manager_id || ''
    })
    setShowForm(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const url = editingId ? '/api/contacts/update' : '/api/contacts/create'
    const body = {
      ...(editingId && { id: editingId }),
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      user_id: form.user_id,
      manager_id: form.manager_id || null
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify(body)
    })

    const result = await res.json()
    if (result.error) {
      alert('Erro: ' + result.error)
    } else {
      alert(editingId ? 'Atualizado!' : 'Adicionado!')
      setForm({ name: '', email: '', phone: '', user_id: '', manager_id: '' })
      setShowForm(false)
      setEditingId(null)
      loadContacts(session.access_token)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir contato?')) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const res = await fetch('/api/contacts/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ id })
    })

    if ((await res.json()).error) {
      alert('Erro ao excluir')
    } else {
      alert('Excluído!')
      loadContacts(session.access_token)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-gray-300 text-lg">Carregando...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-light text-gray-100 mb-1">Contatos (Owner)</h1>
            <p className="text-gray-400 text-sm">Gerencie todos os contatos do sistema</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setEditingId(null)
                setForm({ name: '', email: '', phone: '', user_id: '', manager_id: '' })
                setShowForm(true)
              }}
              className="bg-gray-100 text-black px-5 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              + Adicionar
            </button>
            <button
              onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
              className="bg-gray-800 text-gray-200 px-5 py-2.5 rounded-lg font-medium hover:bg-gray-700 transition-colors"
            >
              Sair
            </button>
          </div>
        </div>

        {showForm && (
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-lg mb-8">
            <h2 className="text-xl font-medium mb-6 text-gray-100">
              {editingId ? 'Editar' : 'Novo'} Contato
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Nome</label>
                <input
                  type="text"
                  placeholder="Nome do contato"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors"
                  required
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <input
                    type="email"
                    placeholder="email@exemplo.com"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Telefone</label>
                  <input
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Vendedor (obrigatório)</label>
                  <select
                    value={form.user_id}
                    onChange={e => setForm({ ...form, user_id: e.target.value })}
                    className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:border-gray-600 transition-colors"
                    required
                  >
                    <option value="">Selecione um vendedor</option>
                    {users
                      .filter(u => u.role === 'Seller')
                      .map(u => (
                        <option key={u.id} value={u.id}>
                          {u.email} (Vendedor)
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Gerente (opcional)</label>
                  <select
                    value={form.manager_id}
                    onChange={e => setForm({ ...form, manager_id: e.target.value })}
                    className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:border-gray-600 transition-colors"
                  >
                    <option value="">Nenhum gerente</option>
                    {users
                      .filter(u => u.role === 'Manager')
                      .map(u => (
                        <option key={u.id} value={u.id}>
                          {u.email} (Gerente)
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <button type="submit" className="bg-gray-100 text-black px-5 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors">
                  {editingId ? 'Atualizar' : 'Salvar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingId(null)
                  }}
                  className="bg-gray-800 text-gray-200 px-5 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800 border-b border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Telefone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Vendedor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Gerente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {contacts.map(c => (
                  <tr key={c.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-100">{c.name}</td>
                    <td className="px-6 py-4 text-gray-400">{c.email || '-'}</td>
                    <td className="px-6 py-4 text-gray-400">{c.phone || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-300">{c.user_email}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">{c.manager_email || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-3">
                        <button onClick={() => openEdit(c)} className="text-gray-300 hover:text-gray-100 text-sm font-medium transition-colors">
                          Editar
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="text-gray-500 hover:text-gray-300 text-sm font-medium transition-colors">
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}