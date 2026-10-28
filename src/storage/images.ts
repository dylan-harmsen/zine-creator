// Image import: decode, downscale to MAX_IMAGE_EDGE, and re-encode.

export const MAX_IMAGE_EDGE = 3000

export interface ImportedImage {
  blob: Blob
  width: number
  height: number
}

export async function importImage(file: Blob): Promise<ImportedImage> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error('That file could not be read as an image.')
  }
  const longEdge = Math.max(bitmap.width, bitmap.height)
  if (longEdge <= MAX_IMAGE_EDGE) {
    const result = { blob: file, width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return result
  }

  const scale = MAX_IMAGE_EDGE / longEdge
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  // PNG keeps transparency; everything else becomes JPEG.
  const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode image'))), type, 0.92),
  )
  return { blob, width, height }
}
