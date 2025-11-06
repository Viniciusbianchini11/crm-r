import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function DELETE(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { id } = await req.json();

  const { error } = await supabase.from('tags').delete().eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
