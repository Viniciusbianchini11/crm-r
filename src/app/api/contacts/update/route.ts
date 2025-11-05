// src/app/api/contacts/update/route.ts
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { id, name, email, phone, user_id, manager_id } = body

  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Token ausente' }, { status: 401 })
  }

  const token = authHeader.split(' ')[1]
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Inválido' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, id')
    .eq('id', user.id)
    .single()

  if (!profile || !['Manager', 'Owner'].includes(profile.role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  let finalUserId = user_id
  let finalManagerId = manager_id

  if (profile.role === 'Manager') {
    if (user_id && user_id !== user.id) {
      const { data: seller } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', user_id)
        .eq('manager_id', user.id)
        .single()
      if (!seller) return NextResponse.json({ error: 'Vendedor não é subordinado' }, { status: 403 })
    }
    if (manager_id && manager_id !== user.id) {
      return NextResponse.json({ error: 'Gerente inválido' }, { status: 403 })
    }
  }

  const { data, error } = await supabaseAdmin
    .from('contacts')
    .update({
      name,
      email: email || null,
      phone: phone || null,
      user_id: finalUserId || undefined,
      manager_id: finalManagerId || null
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ contact: data })
}