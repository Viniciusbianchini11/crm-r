'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import Link from 'next/link'

interface Origin { id: string; name: string }
interface Stage { id: string; name: string; color: string; order_num: number; origin_id: string }
interface Contact { id: string; name: string; email: string | null; user_email: string; stage_id: string }

export default function Dashboard() {
  const [origins, setOrigins] = useState<Origin[]>([])
  const [stages, setStages] = useState<Stage[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedOrigin, setSelectedOrigin] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<'Owner' | 'Manager' | 'Seller' | null>(null)
  const [showHome, setShowHome] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const loadUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      // Carrega o role do usuário
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (profile) {
        setUserRole(profile.role)
      }

      const res = await fetch('/api/origins/user', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      const { origins, stages } = await res.json()

      setOrigins(origins || [])
      setStages(stages || [])
      setLoading(false)
    }

    loadUserData()
  }, [router])

  const loadContacts = async (originId: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch(`/api/contacts/origin/${originId}`, {
      headers: { Authorization: `Bearer ${session.access_token}` }
    })
    const { contacts } = await res.json()
    setContacts(contacts || [])
  }

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return
    const { draggableId: contactId, destination } = result
    const newStageId = destination.droppableId
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch('/api/contacts/update-stage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ contact_id: contactId, stage_id: newStageId })
    })
    if (res.ok) {
      setContacts(prev => prev.map(c => c.id === contactId ? { ...c, stage_id: newStageId } : c))
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-gray-300 text-lg">Carregando...</div>
    </div>
  )

  const getNavLinks = () => {
    if (!userRole) return []
    
    const baseLinks = [
      { href: '/dashboard', label: 'Início', icon: '🏠' }
    ]

    if (userRole === 'Owner') {
      return [
        ...baseLinks,
        { href: '/admin/users', label: 'Usuários', icon: '👥' },
        { href: '/admin/contacts', label: 'Contatos', icon: '📇' },
        { href: '/admin/origins', label: 'Origens', icon: '🌐' }
      ]
    }

    if (userRole === 'Manager') {
      return [
        ...baseLinks,
        { href: '/manager/contacts', label: 'Contatos da Equipe', icon: '👨‍💼' }
      ]
    }

    if (userRole === 'Seller') {
      return [
        ...baseLinks,
        { href: '/seller/contacts', label: 'Meus Contatos', icon: '📞' }
      ]
    }

    return baseLinks
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Navbar */}
      <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <h1 className="text-xl font-light text-gray-100">CRM System</h1>
              <div className="flex items-center gap-1">
                {getNavLinks().map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => {
                      if (link.href === '/dashboard') {
                        setShowHome(true)
                        setSelectedOrigin(null)
                      } else {
                        setShowHome(false)
                      }
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      pathname === link.href || (link.href === '/dashboard' && showHome)
                        ? 'bg-gray-800 text-gray-100'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                    }`}
                  >
                    <span className="mr-2">{link.icon}</span>
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
            <button
              onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
              className="px-4 py-2 bg-gray-800 text-gray-200 rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              Sair
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="p-6">
        <div className="max-w-[1800px] mx-auto">
          {showHome ? (
            /* Home Section */
            <div>
              <div className="mb-10">
                <h2 className="text-3xl font-light text-gray-100 mb-2">Bem-vindo ao Dashboard</h2>
                <p className="text-gray-400">Gerencie seus pipelines e contatos</p>
              </div>

              {/* Origens */}
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-8">
                <h2 className="text-xl font-medium mb-4 text-gray-100">Origens</h2>
                <div className="grid md:grid-cols-4 gap-4">
                  {origins.map(origin => (
                    <button
                      key={origin.id}
                      onClick={() => { 
                        setSelectedOrigin(origin.id)
                        loadContacts(origin.id)
                        setShowHome(false)
                      }}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        selectedOrigin === origin.id
                          ? 'border-gray-400 bg-gray-800'
                          : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
                      }`}
                    >
                      <h3 className="font-medium text-gray-100">{origin.name}</h3>
                    </button>
                  ))}
                  {origins.length === 0 && (
                    <div className="col-span-full text-center py-12">
                      <p className="text-gray-400">Você ainda não foi adicionado a nenhuma origem.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : selectedOrigin ? (
            /* Kanban Board */
            <div>
              <div className="mb-6">
                <button
                  onClick={() => { setShowHome(true); setSelectedOrigin(null) }}
                  className="text-gray-400 hover:text-gray-200 text-sm mb-4 transition-colors"
                >
                  ← Voltar ao início
                </button>
                <h2 className="text-2xl font-light text-gray-100">
                  {origins.find(o => o.id === selectedOrigin)?.name}
                </h2>
              </div>

              <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex gap-4 overflow-x-auto pb-6">
                  {stages
                    .filter(s => s.origin_id === selectedOrigin)
                    .sort((a, b) => a.order_num - b.order_num)
                    .map(stage => {
                      const stageContacts = contacts.filter(c => c.stage_id === stage.id)
                      return (
                        <div key={stage.id} className="min-w-[320px] bg-gray-900 border border-gray-800 rounded-lg p-4 flex-shrink-0">
                          <div className="flex items-center mb-4 pb-3 border-b border-gray-800">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                            <h3 className="ml-3 font-medium text-gray-100 flex-1">{stage.name}</h3>
                            <span className="text-sm text-gray-400 bg-gray-800 px-2 py-1 rounded">
                              {stageContacts.length}
                            </span>
                          </div>

                          <Droppable droppableId={stage.id}>
                            {(provided, snapshot) => (
                              <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className={`space-y-2 min-h-[200px] transition-colors ${
                                  snapshot.isDraggingOver ? 'bg-gray-800/30 rounded-lg' : ''
                                }`}
                              >
                                {stageContacts.map((card, index) => (
                                  <Draggable key={card.id} draggableId={card.id} index={index}>
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className={`bg-gray-800 border border-gray-700 p-4 rounded-lg transition-all cursor-grab active:cursor-grabbing ${
                                          snapshot.isDragging 
                                            ? 'shadow-2xl scale-105 rotate-2 border-gray-600' 
                                            : 'hover:bg-gray-700/50 hover:border-gray-600'
                                        }`}
                                      >
                                        <h4 className="font-medium text-gray-100 text-sm mb-1">{card.name}</h4>
                                        {card.email && (
                                          <p className="text-xs text-gray-400 mb-1 truncate">{card.email}</p>
                                        )}
                                        <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-700">
                                          {card.user_email}
                                        </p>
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </div>
                      )
                    })}
                </div>
              </DragDropContext>

              {stages.filter(s => s.origin_id === selectedOrigin).length === 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center">
                  <p className="text-gray-400">Nenhum estágio configurado para esta origem.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center">
              <p className="text-gray-400">Selecione uma origem para visualizar o pipeline.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
