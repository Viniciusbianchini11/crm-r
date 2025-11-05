// src/app/api/admin/list-all-users/route.ts
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

  if (!profile || profile.role !== 'Owner') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const { data: allUsers } = await supabaseAdmin
    .from('profiles')
    .select('id, role')

  const enriched = await Promise.all(
    (allUsers || []).map(async (u: any) => {
      const { data } = await supabaseAdmin.auth.admin.getUserById(u.id)
      return {
        id: u.id,
        email: data?.user?.email || 'Desconhecido',
        role: u.role
      }
    })
  )

  return NextResponse.json({ users: enriched })
}