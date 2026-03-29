const GROQ_API_URL = 'https://api.groq.com/openai/v1/audio/transcriptions'

/**
 * Transcribe an audio blob using Groq Whisper API.
 * Handles bilingual Tamil-English speech via whisper-large-v3.
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY
  if (!apiKey) throw new Error('Groq API key not configured (VITE_GROQ_API_KEY)')

  // Determine file extension from MIME type
  const ext = audioBlob.type.includes('webm') ? 'webm' : audioBlob.type.includes('mp4') ? 'mp4' : 'wav'
  const file = new File([audioBlob], `recording.${ext}`, { type: audioBlob.type })

  const formData = new FormData()
  formData.append('file', file)
  formData.append('model', 'whisper-large-v3')
  // Don't set language — let Whisper auto-detect for code-switching
  formData.append('prompt', 'This is a veterinary consultation. The doctor speaks in Tamil and English (code-switching). Common terms: morning, afternoon, evening, night, days, tablet, injection, vaccination, deworming.')
  formData.append('response_format', 'text')

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(`Transcription failed (${response.status}): ${errorText}`)
  }

  const text = await response.text()
  return text.trim()
}
