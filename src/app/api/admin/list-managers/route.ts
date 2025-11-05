import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
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
    return NextResponse.json({ error: 'Apenas Owner pode listar gerentes' }, { status: 403 })
  }

  // Busca profiles com role = 'Manager'
  const { data: profiles, error } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('role', 'Manager')

  if (error) {
    console.error('Erro ao buscar profiles:', error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Para cada gerente, busca o email usando a Admin API
  const managers = await Promise.all(
    (profiles || []).map(async (profile) => {
      try {
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.id)
        return {
          id: profile.id,
          email: userData?.user?.email || 'Sem email'
        }
      } catch (err) {
        console.error(`Erro ao buscar usuário ${profile.id}:`, err)
        return {
          id: profile.id,
          email: 'Sem email'
        }
      }
    })
  )

  return NextResponse.json({ managers })
}


