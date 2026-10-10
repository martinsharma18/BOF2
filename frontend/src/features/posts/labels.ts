import type { Post, PostOption, PostType, ReactionType } from '@/lib/types'

/**
 * Post types: the name and description people see, and what each type allows.
 * Rename here once the client decides the names. `payments` must match PostTypeRules.UsesPayments on the server.
 */
export const postTypes: { value: PostType; label: string; description: string; payments: boolean }[] = [
  // Apply → hire → chat → claim payment → paid.
  { value: 'Type1', label: 'Type 1', description: 'First post category', payments: true },
  // Apply → hire → chat. No claim or payment in the app.
  { value: 'Type2', label: 'Type 2', description: 'Second post category', payments: false },
]

export const postTypeLabel = (type: PostType) => postTypes.find((t) => t.value === type)?.label ?? type

/** Whether hired people claim payment and the company pays in the app for this type of post. */
export const postTypeHasPayments = (type: PostType) => postTypes.find((t) => t.value === type)?.payments ?? true

/** The A / B choice on Type 1 posts. Rename here once their business meaning is final. */
export const postOptions: { value: PostOption; label: string; description: string; disabled?: boolean }[] = [
  { value: 'A', label: 'Option A', description: 'First Type 1 option' },
  // Shown but not selectable for now. Remove `disabled` to open it.
  { value: 'B', label: 'Option B', description: 'Second Type 1 option', disabled: true },
]

/** Pre-selected on new Type 1 posts: the first option people can pick. */
export const defaultPostOption = postOptions.find((o) => !o.disabled)?.value

export const postOptionLabel = (option: PostOption) => postOptions.find((o) => o.value === option)?.label ?? option

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
