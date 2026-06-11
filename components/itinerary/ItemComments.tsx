'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { Send } from 'lucide-react'
import type { ItemComment, Profile } from '@/types'

interface Props {
  itemId: string
  tripId: string
  currentUserId: string | null
}

const REACTIONS = ['👍', '❤️', '😂', '😮', '🔥']

export default function ItemComments({ itemId, tripId, currentUserId }: Props) {
  const supabase = createClient()
  const [comments, setComments] = useState<(ItemComment & { profile: Profile })[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    loadComments()
    const channel = supabase
      .channel(`comments:${itemId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'item_comments',
        filter: `item_id=eq.${itemId}`,
      }, () => loadComments())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [itemId])

  async function loadComments() {
    const { data } = await supabase
      .from('item_comments')
      .select('*, profile:profiles (id, display_name, avatar_url)')
      .eq('item_id', itemId)
      .order('created_at')
    setComments((data ?? []) as any)
  }

  async function send() {
    if (!text.trim() || !currentUserId) return
    setSending(true)
    await supabase.from('item_comments').insert({
      item_id: itemId,
      trip_id: tripId,
      user_id: currentUserId,
      body: text.trim(),
    })
    setText('')
    setSending(false)
  }

  async function react(commentId: string, emoji: string, currentReactions: Record<string, string>) {
    if (!currentUserId) return
    const existing = currentReactions[currentUserId]
    const updated = { ...currentReactions }
    if (existing === emoji) {
      delete updated[currentUserId]
    } else {
      updated[currentUserId] = emoji
    }
    await supabase.from('item_comments').update({ reactions: updated }).eq('id', commentId)
  }

  return (
    <div className="mt-3 pt-3 border-t border-white/5 space-y-3">
      {comments.map(c => (
        <div key={c.id} className="flex gap-2">
          <div className="w-6 h-6 rounded-full bg-indigo-600 overflow-hidden shrink-0 mt-0.5">
            {c.profile?.avatar_url ? (
              <Image src={c.profile.avatar_url} alt="" width={24} height={24} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">
                {c.profile?.display_name?.[0]}
              </div>
            )}
          </div>
          <div className="flex-1">
            <span className="text-xs font-medium text-indigo-400">{c.profile?.display_name}</span>
            <p className="text-xs text-slate-300 mt-0.5">{c.body}</p>

            {/* Reactions */}
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {REACTIONS.map(emoji => {
                const count = Object.values(c.reactions ?? {}).filter(r => r === emoji).length
                const mine = c.reactions?.[currentUserId!] === emoji
                return (
                  <button
                    key={emoji}
                    onClick={() => react(c.id, emoji, c.reactions ?? {})}
                    className={`text-xs px-2 py-0.5 rounded-full transition-all ${
                      count > 0
                        ? mine ? 'bg-indigo-600/40 text-indigo-300' : 'bg-slate-800 text-slate-400'
                        : 'text-slate-700 hover:text-slate-500'
                    }`}
                  >
                    {emoji}{count > 0 ? ` ${count}` : ''}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      ))}

      {/* Input */}
      <div className="flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="พิมพ์คอมเมนต์..."
          className="flex-1 bg-slate-900 text-white text-xs rounded-xl px-3 py-2 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button
          onClick={send}
          disabled={sending || !text.trim()}
          className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center active:scale-90 transition-transform disabled:opacity-40"
        >
          <Send size={12} className="text-white" />
        </button>
      </div>
    </div>
  )
}
