// src/app/api/contacts/add-to-origin/route.ts
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { contact_id, origin_id } = body

    if (!contact_id || !origin_id) {
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

    if (!profile || !['Owner', 'Manager'].includes(profile.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { data: member } = await supabaseAdmin
      .from('origin_members')
      .select('role')
      .eq('origin_id', origin_id)
      .eq('user_id', user.id)
      .single()

    if (profile.role !== 'Owner' && (!member || member.role !== 'Manager')) {
      return NextResponse.json({ error: 'Sem permissão nesta origem' }, { status: 403 })
    }

    // Verifica se o contato existe
    const { data: contactExists } = await supabaseAdmin
      .from('contacts')
      .select('id')
      .eq('id', contact_id)
      .single()

    if (!contactExists) {
      return NextResponse.json({ error: 'Contato não encontrado' }, { status: 404 })
    }

    // Verifica se a origem existe
    const { data: originExists } = await supabaseAdmin
      .from('origins')
      .select('id')
      .eq('id', origin_id)
      .single()

    if (!originExists) {
      return NextResponse.json({ error: 'Origem não encontrada' }, { status: 404 })
    }

    // Verifica se já está adicionado
    const { data: alreadyExists } = await supabaseAdmin
      .from('contact_origins')
      .select('id')
      .eq('contact_id', contact_id)
      .eq('origin_id', origin_id)
      .single()

    if (alreadyExists) {
      return NextResponse.json({ error: 'Contato já adicionado a esta origem' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('contact_origins')
      .insert({ contact_id, origin_id })

    if (error) {
      console.error('Erro ao inserir contact_origin:', error)
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Contato já adicionado a esta origem' }, { status: 400 })
      }
      if (error.code === '23503') {
        return NextResponse.json({ error: 'Contato ou origem inválidos' }, { status: 400 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Erro em add-to-origin:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}