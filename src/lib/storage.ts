import { supabase } from './supabase'

export async function uploadAnalysisImage(
  base64: string,
  mimeType: string,
  userId: string
): Promise<string> {
  const ext = mimeType.split('/')[1] || 'jpg'
  const path = `${userId}/${crypto.randomUUID()}.${ext}`

  const binary = atob(base64)
  const arr = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i)
  const blob = new Blob([arr], { type: mimeType })

  const { error } = await supabase.storage
    .from('analysis-images')
    .upload(path, blob, { contentType: mimeType })

  if (error) throw new Error(`Image upload failed: ${error.message}`)

  const { data } = supabase.storage.from('analysis-images').getPublicUrl(path)
  return data.publicUrl
}
