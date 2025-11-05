// src/app/api/contacts/update-stage/route.ts
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { contact_id, stage_id } = body

    if (!contact_id || !stage_id) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token ausente' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
    }

    // Verifica se o contato existe e se o usuário tem acesso
    const { data: contact } = await supabaseAdmin
      .from('contacts')
      .select('id, user_id, manager_id')
      .eq('id', contact_id)
      .single()

    if (!contact) {
      return NextResponse.json({ error: 'Contato não encontrado' }, { status: 404 })
    }

    // Verifica permissões
    if (profile.role === 'Seller' && contact.user_id !== user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    if (profile.role === 'Manager' && contact.manager_id !== user.id && contact.user_id !== user.id) {
      // Verifica se é gerente de um vendedor que tem o contato
      const { data: seller } = await supabaseAdmin
        .from('profiles')
        .select('manager_id')
        .eq('id', contact.user_id)
        .eq('manager_id', user.id)
        .single()

      if (!seller) {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
      }
    }

    // Verifica se o stage existe
    const { data: stage } = await supabaseAdmin
      .from('pipeline_stages')
      .select('id')
      .eq('id', stage_id)
      .single()

    if (!stage) {
      return NextResponse.json({ error: 'Stage não encontrado' }, { status: 404 })
    }

    // Atualiza o stage do contato
    const { error: updateError } = await supabaseAdmin
      .from('contacts')
      .update({ pipeline_stage_id: stage_id })
      .eq('id', contact_id)

    if (updateError) {
      console.error('Erro ao atualizar stage:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Erro em update-stage:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}


