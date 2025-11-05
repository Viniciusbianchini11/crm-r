'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Plus, Menu, X } from 'lucide-react'

interface Origin { id: string; name: string; description: string }
interface Stage { id: string; name: string; color: string; order_num: number; origin_id: string }
interface ContactCard { id: string; name: string; email: string | null; phone: string | null; user_email: string; stage_id: string }
interface Member { user_id: string; role: 'Manager' | 'Seller'; profiles: { email: string } }

export default function AdminOrigins() {
  const [origins, setOrigins] = useState<Origin[]>([])
  const [stages, setStages] = useState<Stage[]>([])
  const [contacts, setContacts] = useState<ContactCard[]>([])
  const [allContacts, setAllContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrigin, setSelectedOrigin] = useState<string | null>(null)
  const [showOriginForm, setShowOriginForm] = useState(false)
  const [originForm, setOriginForm] = useState({ name: '', description: '' })
  const [showStageForm, setShowStageForm] = useState(false)
  const [stageForm, setStageForm] = useState({ name: '', color: '#3B82F6' })
  const [showAddContactModal, setShowAddContactModal] = useState(false)
  const [contactSearch, setContactSearch] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newMemberRole, setNewMemberRole] = useState<'Manager' | 'Seller'>('Seller')
  const [originMembers, setOriginMembers] = useState<Member[]>([])
  const router = useRouter()

  useEffect(() => {
    const checkAndLoad = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      if (profile?.role !== 'Owner') { alert('Acesso negado.'); router.push('/dashboard'); return }

      await loadOrigins(session.access_token)
      await loadAllContacts(session.access_token)
    }
    checkAndLoad()
  }, [router])

  const loadOrigins = async (token: string) => {
    setLoading(true)
    const res = await fetch('/api/origins/list', { headers: { Authorization: `Bearer ${token}` } })
    const { origins, stages } = await res.json()
    setOrigins(origins || [])
    setStages(stages || [])
    setLoading(false)
  }

  const loadAllContacts = async (token: string) => {
    const res = await fetch('/api/contacts/all', { headers: { Authorization: `Bearer ${token}` } })
    const { contacts } = await res.json()
    setAllContacts(contacts || [])
  }

  const loadContacts = async (originId: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch(`/api/contacts/origin/${originId}`, { headers: { Authorization: `Bearer ${session.access_token}` } })
    const { contacts } = await res.json()
    const enriched = await Promise.all((contacts || []).map(async (c: any) => {
      const emailRes = await fetch(`/api/contacts/user-email?user_id=${c.user_id}`)
      const { email } = await emailRes.json()
      return { id: c.id, name: c.name, email: c.email, phone: c.phone, user_email: email, stage_id: c.stage_id }
    }))
    setContacts(enriched)
  }

  const loadMembers = async (originId: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch('/api/origins/members/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ origin_id: originId })
    })
    const { members } = await res.json()
    setOriginMembers(members || [])
  }

  const handleSaveOrigin = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch('/api/origins/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(originForm)
    })
    if (res.ok) {
      setShowOriginForm(false); setOriginForm({ name: '', description: '' }); loadOrigins(session.access_token)
    } else alert('Erro ao salvar origem')
  }

  const handleSaveStage = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session || !selectedOrigin) return
    const body = { ...stageForm, origin_id: selectedOrigin }
    const res = await fetch('/api/stages/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(body)
    })
    if (res.ok) {
      setShowStageForm(false); setStageForm({ name: '', color: '#3B82F6' }); loadOrigins(session.access_token)
    } else alert('Erro ao salvar etapa')
  }

  const handleAddContactToOrigin = async (contact_id: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session || !selectedOrigin) return
  
    try {
      const res = await fetch('/api/contacts/add-to-origin', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${session.access_token}` 
        },
        body: JSON.stringify({ contact_id, origin_id: selectedOrigin })
      })
  
      let data
      try {
        data = await res.json()
      } catch {
        data = { error: 'Erro ao processar resposta do servidor' }
      }
  
      if (res.ok) {
        loadContacts(selectedOrigin)
        setShowAddContactModal(false)
        setContactSearch('')
      } else {
        alert(data.error || 'Erro desconhecido')
      }
    } catch (err) {
      console.error('Erro ao adicionar contato:', err)
      alert('Erro de rede. Verifique sua conexão.')
    }
  }

  const handleAddMember = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session || !selectedOrigin) return
    const res = await fetch('/api/origins/members/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ origin_id: selectedOrigin, email: newMemberEmail, role: newMemberRole })
    })
    if (res.ok) {
      setNewMemberEmail(''); loadMembers(selectedOrigin)
    } else alert('Erro ao adicionar membro')
  }

  const handleRemoveMember = async (user_id: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session || !selectedOrigin) return
    await fetch('/api/origins/members/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ origin_id: selectedOrigin, user_id })
    })
    loadMembers(selectedOrigin)
  }

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return

    if (result.type === 'CONTACT') {
      const { draggableId: contactId, destination } = result
      const newStageId = destination.droppableId
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/contacts/update-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ contact_id: contactId, stage_id: newStageId })
      })
      if (res.ok) setContacts(prev => prev.map(c => c.id === contactId ? { ...c, stage_id: newStageId } : c))
    } else if (result.type === 'STAGE') {
      const newStages = Array.from(stages.filter(s => s.origin_id === selectedOrigin))
      const [removed] = newStages.splice(result.source.index, 1)
      newStages.splice(result.destination.index, 0, removed)
      const updated = newStages.map((s, i) => ({ id: s.id, order_num: i }))
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      await fetch('/api/stages/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ stages: updated })
      })
      setStages(prev => prev.map(s => {
        const updatedStage = updated.find(u => u.id === s.id)
        return updatedStage ? { ...s, order_num: updatedStage.order_num } : s
      }))
    }
  }

  useEffect(() => {
    if (selectedOrigin) {
      loadContacts(selectedOrigin)
      loadMembers(selectedOrigin)
    }
  }, [selectedOrigin])

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-lg text-gray-300">Carregando origens...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-black flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 bg-gray-900 border-r border-gray-800 shadow-lg overflow-hidden`}>
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-medium text-gray-100 flex items-center gap-2">
              Origens
            </h2>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-gray-200">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4">
          <button
            onClick={() => setShowOriginForm(true)}
            className="w-full bg-gray-100 text-black py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" /> Nova Origem
          </button>
        </div>

        <div className="px-4 space-y-2 max-h-[calc(100vh-180px)] overflow-y-auto">
          {origins.map(origin => (
            <button
              key={origin.id}
              onClick={() => { setSelectedOrigin(origin.id); setSidebarOpen(false) }}
              className={`w-full text-left p-3 rounded-lg transition ${
                selectedOrigin === origin.id
                  ? 'bg-gray-800 border-l-4 border-gray-400'
                  : 'bg-gray-800/50 hover:bg-gray-800 border-l-4 border-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span className="font-medium text-gray-100">{origin.name}</span>
              </div>
              {origin.description && <p className="text-xs text-gray-400 mt-1">{origin.description}</p>}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-300 hover:text-gray-100">
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-light text-gray-100">
            {selectedOrigin ? origins.find(o => o.id === selectedOrigin)?.name : 'Selecione uma origem'}
          </h1>
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} className="bg-gray-800 text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
            Sair
          </button>
        </div>

        {selectedOrigin ? (
          <div>
            <div className="flex justify-end mb-4">
              <button onClick={() => setShowStageForm(true)} className="bg-gray-100 text-black px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-200 transition-colors font-medium">
                <Plus className="w-4 h-4" /> Nova Etapa
              </button>
            </div>

            {showStageForm && (
              <div className="bg-gray-900 border border-gray-800 p-4 rounded-lg mb-6 flex gap-3 items-center">
                <input 
                  placeholder="Nome da etapa" 
                  value={stageForm.name} 
                  onChange={e => setStageForm({ ...stageForm, name: e.target.value })} 
                  className="flex-1 p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors" 
                />
                <input 
                  type="color" 
                  value={stageForm.color} 
                  onChange={e => setStageForm({ ...stageForm, color: e.target.value })} 
                  className="w-12 h-10 rounded cursor-pointer" 
                />
                <button onClick={handleSaveStage} className="bg-gray-100 text-black px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium">Salvar</button>
                <button onClick={() => setShowStageForm(false)} className="bg-gray-800 text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">Cancelar</button>
              </div>
            )}

            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="stages" type="STAGE" direction="horizontal">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="flex gap-4 overflow-x-auto pb-6">
                    {stages.filter(s => s.origin_id === selectedOrigin).sort((a, b) => a.order_num - b.order_num).map((stage, index) => (
                      <Draggable key={stage.id} draggableId={stage.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`min-w-[320px] bg-gray-900 border border-gray-800 rounded-lg p-4 flex-shrink-0 ${snapshot.isDragging ? 'shadow-2xl' : ''}`}
                          >
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-800">
                              <h3 className="font-medium text-gray-100 flex items-center gap-2" {...provided.dragHandleProps}>
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }}></div>
                                {stage.name}
                              </h3>
                              <span className="text-sm text-gray-400 bg-gray-800 px-2 py-1 rounded">
                                {contacts.filter(c => c.stage_id === stage.id).length}
                              </span>
                            </div>

                            <Droppable droppableId={stage.id} type="CONTACT">
                              {(provided, snapshot) => (
                                <div 
                                  {...provided.droppableProps} 
                                  ref={provided.innerRef} 
                                  className={`space-y-2 min-h-[200px] transition-colors ${
                                    snapshot.isDraggingOver ? 'bg-gray-800/30 rounded-lg' : ''
                                  }`}
                                >
                                  {contacts.filter(c => c.stage_id === stage.id).map((card, idx) => (
                                    <Draggable key={card.id} draggableId={card.id} index={idx}>
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                          className={`bg-gray-800 border border-gray-700 p-3 rounded-lg transition-all cursor-grab active:cursor-grabbing ${
                                            snapshot.isDragging 
                                              ? 'shadow-2xl scale-105 rotate-2 border-gray-600' 
                                              : 'hover:bg-gray-700/50 hover:border-gray-600'
                                          }`}
                                        >
                                          <h4 className="font-medium text-gray-100 text-sm mb-1">{card.name}</h4>
                                          {card.email && (
                                            <p className="text-xs text-gray-400 mb-1 truncate">{card.email}</p>
                                          )}
                                          <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-700">{card.user_email}</p>
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                  {provided.placeholder}
                                  <div className="mt-4">
                                    <button
                                      onClick={() => setShowAddContactModal(true)}
                                      className="w-full text-xs text-gray-400 hover:text-gray-200 transition-colors"
                                    >
                                      + Adicionar contato
                                    </button>
                                  </div>
                                </div>
                              )}
                            </Droppable>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            {/* CONFIGURAÇÕES DA ORIGEM */}
            <div className="mt-12 bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-medium mb-6 text-gray-100">Configurações da Origem</h3>

              <div className="space-y-6">
                {/* Adicionar Membro */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Adicionar Membro</label>
                  <div className="flex gap-3">
                    <input
                      type="email"
                      placeholder="email@exemplo.com"
                      value={newMemberEmail}
                      onChange={e => setNewMemberEmail(e.target.value)}
                      className="flex-1 p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors"
                    />
                    <select
                      value={newMemberRole}
                      onChange={e => setNewMemberRole(e.target.value as 'Manager' | 'Seller')}
                      className="p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:border-gray-600 transition-colors"
                    >
                      <option value="Manager">Gerente</option>
                      <option value="Seller">Vendedor</option>
                    </select>
                    <button
                      onClick={handleAddMember}
                      className="bg-gray-100 text-black px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>

                {/* Lista de Membros */}
                <div>
                  <h4 className="font-medium text-gray-300 mb-3">Membros Atuais</h4>
                  {originMembers.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">Nenhum membro adicionado.</p>
                  ) : (
                    <div className="space-y-2">
                      {originMembers.map(m => (
                        <div key={m.user_id} className="flex items-center justify-between p-3 bg-gray-800 border border-gray-700 rounded-lg">
                          <div>
                            <span className="font-medium text-gray-100">{m.profiles.email}</span>
                            <span className="ml-2 text-xs text-gray-400 px-2 py-1 bg-gray-700 rounded-full">
                              {m.role === 'Manager' ? 'Gerente' : 'Vendedor'}
                            </span>
                          </div>
                          <button
                            onClick={() => handleRemoveMember(m.user_id)}
                            className="text-gray-400 text-sm hover:text-gray-200 transition-colors"
                          >
                            Remover
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center">
            <p className="text-gray-400 text-lg">Selecione uma origem para visualizar o funil</p>
          </div>
        )}
      </div>

      {/* Modal: Nova Origem */}
      {showOriginForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl font-medium mb-4 text-gray-100">Nova Origem</h2>
            <input
              placeholder="Nome da origem"
              value={originForm.name}
              onChange={e => setOriginForm({ ...originForm, name: e.target.value })}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg mb-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors"
            />
            <input
              placeholder="Descrição (opcional)"
              value={originForm.description}
              onChange={e => setOriginForm({ ...originForm, description: e.target.value })}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg mb-4 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors"
            />
            <div className="flex gap-3">
              <button
                onClick={handleSaveOrigin}
                className="flex-1 bg-gray-100 text-black py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Criar Origem
              </button>
              <button
                onClick={() => { setShowOriginForm(false); setOriginForm({ name: '', description: '' }) }}
                className="flex-1 bg-gray-800 text-gray-200 py-3 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Adicionar Contato */}
      {showAddContactModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
            <h3 className="text-lg font-medium mb-4 text-gray-100">Adicionar Contato à Origem</h3>
            <input
              placeholder="Buscar por nome ou email..."
              value={contactSearch}
              onChange={e => setContactSearch(e.target.value)}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg mb-4 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors"
            />
            <div className="max-h-64 overflow-y-auto space-y-2">
              {allContacts
                .filter(c => 
                  c.name.toLowerCase().includes(contactSearch.toLowerCase()) || 
                  (c.email && c.email.toLowerCase().includes(contactSearch.toLowerCase()))
                )
                .map(c => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700/50 transition-colors">
                    <div>
                      <p className="font-medium text-sm text-gray-100">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.email || 'Sem email'}</p>
                    </div>
                    <button
                      onClick={() => handleAddContactToOrigin(c.id)}
                      className="text-xs text-gray-300 hover:text-gray-100 transition-colors font-medium"
                    >
                      Adicionar
                    </button>
                  </div>
                ))}
            </div>
            <button
              onClick={() => { setShowAddContactModal(false); setContactSearch('') }}
              className="mt-4 w-full bg-gray-800 text-gray-200 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}