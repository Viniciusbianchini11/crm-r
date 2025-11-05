// src/app/api/origins/user/route.ts
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

  if (!profile) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

  let origins = []
  let stages = []

  if (profile.role === 'Owner') {
    // Owner vê todas
    const { data: allOrigins } = await supabaseAdmin.from('origins').select('*')
    const { data: allStages } = await supabaseAdmin.from('pipeline_stages').select('*')
    origins = allOrigins || []
    stages = allStages || []
  } else {
    // Manager e Seller: só origens que fazem parte
    const { data: memberOrigins } = await supabaseAdmin
      .from('origin_members')
      .select('origin_id')
      .eq('user_id', user.id)

    const originIds = memberOrigins?.map(m => m.origin_id) || []

    if (originIds.length > 0) {
      const { data: userOrigins } = await supabaseAdmin
        .from('origins')
        .select('*')
        .in('id', originIds)

      const { data: userStages } = await supabaseAdmin
        .from('pipeline_stages')
        .select('*')
        .in('origin_id', originIds)

      origins = userOrigins || []
      stages = userStages || []
    }
  }

  return NextResponse.json({ origins, stages })
}