// src/app/api/contacts/list/route.ts
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Token ausente' }, { status: 401 })
  }

  const token = authHeader.split(' ')[1]
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Inválido' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, manager_id')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

  let query = supabaseAdmin
    .from('contacts')
    .select('id, name, email, phone, user_id, created_at')
    .order('created_at', { ascending: false })

  if (profile.role === 'Seller') {
    query = query.eq('user_id', user.id)
  } else if (profile.role === 'Manager') {
    const { data: sellers } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('manager_id', user.id)

    const sellerIds = sellers?.map(s => s.id) || []
    query = query.in('user_id', [user.id, ...sellerIds])
  }
  // Owner vê tudo

  const { data: contacts, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ contacts })
}