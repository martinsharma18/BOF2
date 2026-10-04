/**
 * Shrinks a photo in the browser before upload so phones on mobile data send ~200–400 KB instead of a
 * multi-MB camera image. GIFs (may be animated) and files already small enough are returned unchanged,
 * as is the original whenever shrinking fails or wouldn't help.
 */
export async function shrinkImage(file: File, maxSide = 1600, quality = 0.82): Promise<File> {
  if (file.type === 'image/gif' || file.size < 200 * 1024) return file

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file

    // PNGs may be transparent: keep that with WEBP. Everything else becomes a JPEG on white.
    const keepAlpha = file.type === 'image/png'
    if (!keepAlpha) {
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, width, height)
    }
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const type = keepAlpha ? 'image/webp' : 'image/jpeg'
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))
    // Older Safari can't encode WEBP and silently returns a PNG; keep the original then.
    if (!blob || blob.type !== type || blob.size >= file.size) return file

    const name = file.name.replace(/\.[^.]+$/, '') + (type === 'image/webp' ? '.webp' : '.jpg')
    return new File([blob], name, { type, lastModified: Date.now() })
  } catch {
    return file
  }
}
