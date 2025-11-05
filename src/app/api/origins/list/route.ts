// src/app/api/origins/list/route.ts
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

  // Buscar origens
  const { data: origins, error: originsError } = await supabaseAdmin
    .from('origins')
    .select('*')
    .order('created_at', { ascending: false })

  if (originsError) {
    return NextResponse.json({ error: originsError.message }, { status: 500 })
  }

  // Buscar etapas com origem
  const { data: stages, error: stagesError } = await supabaseAdmin
    .from('pipeline_stages')
    .select('id, name, color, order_num, origin_id')
    .order('order_num', { ascending: true })

  if (stagesError) {
    return NextResponse.json({ error: stagesError.message }, { status: 500 })
  }

  return NextResponse.json({ origins, stages })
}