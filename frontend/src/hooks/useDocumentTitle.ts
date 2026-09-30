import { useEffect } from 'react'
import { APP_NAME } from '@/lib/brand'

export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    if (title) document.title = `${title} · ${APP_NAME}`
  }, [title])
}
