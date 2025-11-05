import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { email, password, role, manager_id } = body

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

  if (!profile || profile.role !== 'Owner') {
    return NextResponse.json({ error: 'Apenas Owner pode criar usuários' }, { status: 403 })
  }

  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role, manager_id: manager_id || null }
  })

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 })
  }

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert({
      id: newUser.user.id,
      role,
      manager_id: manager_id || null
    })

  if (profileError) {
    console.error('Erro ao criar profile:', profileError)
    return NextResponse.json({ 
      error: 'Usuário criado, mas erro ao criar perfil',
      details: profileError.message 
    }, { status: 500 })
  }

  return NextResponse.json({ 
    success: true,
    message: 'Usuário criado e perfil salvo!',
    user: newUser.user 
  })
}