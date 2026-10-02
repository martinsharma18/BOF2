import type { Post, PostType, ReactionType } from '@/lib/types'

/** Display names for post types. Rename here once their business meaning is final. */
export const postTypes: { value: PostType; label: string; description: string }[] = [
  { value: 'Type1', label: 'Type 1', description: 'First post category' },
  { value: 'Type2', label: 'Type 2', description: 'Second post category' },
]

export const postTypeLabel = (type: PostType) => postTypes.find((t) => t.value === type)?.label ?? type

export const reactions: { type: ReactionType; emoji: string; label: string }[] = [
  { type: 'Like', emoji: '👍', label: 'Like' },
  { type: 'Love', emoji: '❤️', label: 'Love' },
  { type: 'Haha', emoji: '😂', label: 'Haha' },
  { type: 'Wow', emoji: '😮', label: 'Wow' },
  { type: 'Sad', emoji: '😢', label: 'Sad' },
]

export const reactionMeta = (type: ReactionType) => reactions.find((r) => r.type === type)!

export function genderLabel(post: Pick<Post, 'acceptsMale' | 'acceptsFemale'>) {
  if (post.acceptsMale && post.acceptsFemale) return 'Both (Male & Female)'
  return post.acceptsMale ? 'Male only' : 'Female only'
}

export function locationLabel(post: Pick<Post, 'isFromAnywhere' | 'province' | 'district' | 'localLevel'>) {
  if (post.isFromAnywhere) return 'Anywhere in Nepal'
  return [post.localLevel, post.district, post.province].filter(Boolean).join(', ')
}
