// src/app/api/manager/list-sellers/route.ts
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
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'Manager') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const { data: sellers } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('manager_id', user.id)
    .eq('role', 'Seller')

  const enriched = await Promise.all(
    (sellers || []).map(async (s: any) => {
      const { data } = await supabaseAdmin.auth.admin.getUserById(s.id)
      return { id: s.id, email: data?.user?.email || 'Desconhecido' }
    })
  )

  return NextResponse.json({ sellers: enriched })
}