import { useRef } from 'react'
import { Camera } from 'lucide-react'
import { Avatar, Button, toast } from '@/components/ui'
import { getErrorMessage } from '@/lib/api'
import type { PublicProfile } from '@/lib/types'
import { useAvatar } from './api'

export function AvatarUploader({ profile }: { profile: PublicProfile }) {
  const avatar = useAvatar()
  const input = useRef<HTMLInputElement>(null)
  const name = profile.companyName ?? profile.fullName

  const upload = (file: File | null) =>
    avatar.mutate(file, {
      onSuccess: () => toast.success(file ? 'Photo updated' : 'Photo removed'),
      onError: (error) => toast.error(getErrorMessage(error)),
    })

  return (
    <div className="flex items-center gap-5">
      <div className="relative">
        <Avatar name={name} src={profile.avatarUrl} size="xl" />
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="absolute right-0 bottom-0 flex size-8 items-center justify-center rounded-full bg-white text-slate-700 shadow-pop ring-1 ring-slate-200 hover:text-brand-600"
          aria-label="Change photo"
        >
          <Camera className="size-4" />
        </button>
      </div>
      <div className="space-y-2">
        <p className="text-sm text-slate-500">JPG, PNG or WEBP. Max 5 MB.</p>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" loading={avatar.isPending} onClick={() => input.current?.click()}>
            Upload photo
          </Button>
          {profile.avatarUrl && (
            <Button size="sm" variant="ghost" disabled={avatar.isPending} onClick={() => upload(null)}>
              Remove
            </Button>
          )}
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) upload(file)
        }}
      />
    </div>
  )
}
