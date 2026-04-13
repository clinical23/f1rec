'use server'

import { createServerClient } from '@/lib/supabase/server'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type SubscribeResult = {
  success: boolean
  message: string
}

export async function subscribeAction(formData: FormData): Promise<SubscribeResult> {
  const rawEmail = formData.get('email')
  const rawSource = formData.get('source')

  if (typeof rawEmail !== 'string') {
    return { success: false, message: 'Please enter a valid email address.' }
  }

  const email = rawEmail.trim().toLowerCase()
  const source =
    typeof rawSource === 'string' && rawSource.trim() !== '' ? rawSource.trim().slice(0, 120) : 'community'

  if (!email) {
    return { success: false, message: 'Please enter your email address.' }
  }

  if (!EMAIL_REGEX.test(email)) {
    return { success: false, message: 'That doesn’t look like a valid email address.' }
  }

  const supabase = createServerClient()

  const { error: insertError } = await supabase.from('subscribers').insert({
    email,
    source,
  })

  if (!insertError) {
    return { success: true, message: "You're in! We'll keep you posted." }
  }

  if (String(insertError.code) !== '23505') {
    return {
      success: false,
      message: 'Something went wrong. Please try again in a moment.',
    }
  }

  const { data: reactivated, error: updateError } = await supabase
    .from('subscribers')
    .update({
      is_active: true,
      subscribed_at: new Date().toISOString(),
      unsubscribed_at: null,
      source,
    })
    .eq('email', email)
    .eq('is_active', false)
    .select('id')

  if (updateError) {
    return { success: true, message: "You're already on the list!" }
  }

  if (reactivated && reactivated.length > 0) {
    return { success: true, message: "You're in! We'll keep you posted." }
  }

  return { success: true, message: "You're already on the list!" }
}
