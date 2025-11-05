// src/app/api/contacts/user-email/route.ts
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const user_id = searchParams.get('user_id')

  if (!user_id) {
    return NextResponse.json({ error: 'user_id é obrigatório' }, { status: 400 })
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(user_id)
    if (error) throw error

    return NextResponse.json({ email: data?.user?.email || 'Desconhecido' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}