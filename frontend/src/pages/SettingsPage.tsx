import { Card, PageHeader, PageSpinner, Alert } from '@/components/ui'
import { AvatarUploader } from '@/features/users/AvatarUploader'
import { ChangePasswordForm } from '@/features/users/ChangePasswordForm'
import { ProfileForm } from '@/features/users/ProfileForm'
import { useMyProfile } from '@/features/users/api'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { getErrorMessage } from '@/lib/api'
import type { ReactNode } from 'react'

export function SettingsPage() {
  useDocumentTitle('Settings')
  const me = useMyProfile()

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" description="Manage your profile and account security." />
      {me.isLoading ? (
        <PageSpinner />
      ) : me.isError || !me.data ? (
        <Alert>{getErrorMessage(me.error)}</Alert>
      ) : (
        <div className="space-y-6">
          <Section title="Profile photo">
            <AvatarUploader profile={me.data.profile} />
          </Section>
          <Section title="Profile" description="This information appears on your public profile (phone and email stay private).">
            <ProfileForm me={me.data} />
          </Section>
          <Section title="Password" description="Changing your password signs you out on other devices.">
            <ChangePasswordForm />
          </Section>
        </div>
      )}
    </div>
  )
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card className="p-5 sm:p-7">
      <h2 className="text-lg font-bold">{title}</h2>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      <div className="mt-5">{children}</div>
    </Card>
  )
}
