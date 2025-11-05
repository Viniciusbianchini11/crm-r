// src/app/api/origins/members/add/route.ts
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { origin_id, email, role } = await request.json()
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Token ausente' }, { status: 401 })

  const token = authHeader.split(' ')[1]
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Inválido' }, { status: 401 })

  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['Owner', 'Manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  // Verificar se o usuário que adiciona tem permissão na origem
  const { data: member } = await supabaseAdmin
    .from('origin_members')
    .select('role')
    .eq('origin_id', origin_id)
    .eq('user_id', user.id)
    .single()

  if (profile.role !== 'Owner' && (!member || member.role !== 'Manager')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  // Buscar usuário por email
  const { data: targetUser } = await supabaseAdmin.auth.admin.listUsers()
  const found = targetUser.users.find(u => u.email === email)
  if (!found) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  const { error } = await supabaseAdmin
    .from('origin_members')
    .upsert({ origin_id, user_id: found.id, role }, { onConflict: 'origin_id,user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}