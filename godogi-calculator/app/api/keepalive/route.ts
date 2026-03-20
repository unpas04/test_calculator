import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    // DB가 절전 모드에 들어가지 않도록 가벼운 쿼리 실행
    await supabase.from('menus').select('id').limit(1)
    return NextResponse.json({ ok: true, time: new Date().toISOString() })
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
