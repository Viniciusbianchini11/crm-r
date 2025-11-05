// src/app/api/contacts/origin/[id]/route.ts
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Token ausente' }, { status: 401 })

    const token = authHeader.split(' ')[1]
    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'Inválido' }, { status: 401 })

    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
    if (!profile) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

    const { data: member } = await supabaseAdmin
      .from('origin_members')
      .select('role')
      .eq('origin_id', id)
      .eq('user_id', user.id)
      .single()

    if (profile.role !== 'Owner' && !member) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { data: contacts, error } = await supabaseAdmin
      .from('contact_origins')
      .select(`
        contact_id,
        contacts (
          id, name, email, phone, user_id, pipeline_stage_id
        )
      `)
      .eq('origin_id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

    const enriched = await Promise.all(
      (contacts || []).map(async (c: any) => {
        try {
          const emailRes = await fetch(`${baseUrl}/api/contacts/user-email?user_id=${c.contacts.user_id}`)
          const { email } = await emailRes.json()
          return {
            id: c.contacts.id,
            name: c.contacts.name,
            email: c.contacts.email,
            phone: c.contacts.phone,
            user_email: email || 'Sem vendedor',
            stage_id: c.contacts.pipeline_stage_id
          }
        } catch {
          return {
            id: c.contacts.id,
            name: c.contacts.name,
            email: c.contacts.email,
            phone: c.contacts.phone,
            user_email: 'Erro ao carregar',
            stage_id: c.contacts.pipeline_stage_id
          }
        }
      })
    )

    return NextResponse.json({ contacts: enriched })
  } catch (err: any) {
    console.error('Erro em GET origin contacts:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}