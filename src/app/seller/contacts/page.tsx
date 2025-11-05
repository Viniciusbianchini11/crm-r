'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Contact {
  id: string
  name: string
  email: string | null
  phone: string | null
  created_at: string
}

export default function SellerContacts() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      // Verifica se é Vendedor
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (profile?.role !== 'Seller') {
        alert('Acesso negado. Apenas Vendedores podem ver esta página.')
        router.push('/dashboard')
        return
      }

      // Carrega contatos
      await loadContacts(session.access_token)
    }

    checkAuthAndLoad()
  }, [router])

  const loadContacts = async (token: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/contacts/list', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!res.ok) {
        const error = await res.json()
        alert('Erro: ' + (error.error || 'Falha ao carregar'))
        setLoading(false)
        return
      }

      const { contacts } = await res.json()
      setContacts(contacts || [])
    } catch (err) {
      alert('Erro de conexão')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-gray-300 text-lg">Carregando seus contatos...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-light text-gray-100 mb-1">Meus Contatos</h1>
            <p className="text-gray-400 text-sm">Visualize seus contatos atribuídos</p>
          </div>
          <button
            onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
            className="bg-gray-800 text-gray-200 px-5 py-2.5 rounded-lg font-medium hover:bg-gray-700 transition-colors"
          >
            Sair
          </button>
        </div>

        {contacts.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 p-12 rounded-lg text-center">
            <p className="text-gray-400 text-lg mb-2">Você ainda não tem contatos.</p>
            <p className="text-sm text-gray-500">
              Seus contatos aparecerão aqui quando forem adicionados.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {contacts.map(contact => (
              <div
                key={contact.id}
                className="bg-gray-900 border border-gray-800 p-6 rounded-lg hover:bg-gray-800/50 transition-colors"
              >
                <h3 className="font-medium text-lg text-gray-100 mb-3">{contact.name}</h3>
                <div className="space-y-2 text-sm text-gray-400">
                  {contact.email && (
                    <p className="flex items-center gap-2">
                      <span className="text-gray-500">Email:</span>
                      <span className="text-gray-300">{contact.email}</span>
                    </p>
                  )}
                  {contact.phone && (
                    <p className="flex items-center gap-2">
                      <span className="text-gray-500">Telefone:</span>
                      <span className="text-gray-300">{contact.phone}</span>
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-4 pt-3 border-t border-gray-800">
                    Adicionado em: {new Date(contact.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}