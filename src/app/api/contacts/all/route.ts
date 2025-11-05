// src/app/api/contacts/all/route.ts
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Token ausente' }, { status: 401 })

  const token = authHeader.split(' ')[1]
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Inválido' }, { status: 401 })

  const { data: contacts } = await supabaseAdmin
    .from('contacts')
    .select('id, name, email, phone')

  return NextResponse.json({ contacts: contacts || [] })
}