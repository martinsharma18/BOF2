/** Turns a title into a safe file name, e.g. "5 helpers needed!" -> "5-helpers-needed". */
export function toFileName(title: string) {
  return (
    title
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'image'
  )
}

/**
 * Saves a file to the user's device. Fetches it as a blob so the browser downloads it
 * instead of opening it in a new tab (the `download` attribute alone is ignored for some image types).
 */
export async function downloadFile(url: string, baseName: string) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Download failed (${response.status})`)
  const blob = await response.blob()

  const extension = url.split('?')[0].match(/\.[a-z0-9]+$/i)?.[0] ?? ''
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = `${baseName}${extension}`
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Give the browser a moment to start the download before releasing the blob.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}
