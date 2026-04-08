const GROQ_API_URL = 'https://api.groq.com/openai/v1/audio/transcriptions'
const CHUNK_DURATION_SEC = 30

/**
 * Transcribe an audio blob using Groq Whisper API.
 * Long recordings are automatically split into 30-second chunks
 * and transcribed in parallel for better accuracy.
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const chunks = await splitAudioIntoChunks(audioBlob)

  console.log(`[Voice AI] Split audio into ${chunks.length} chunk(s)`)

  if (chunks.length === 1) {
    return transcribeChunk(chunks[0])
  }

  // Transcribe all chunks in parallel
  const results = await Promise.all(chunks.map(transcribeChunk))
  return results.filter((t) => t.trim().length > 0).join(' ')
}

/**
 * Transcribe a single audio chunk via Groq Whisper.
 */
async function transcribeChunk(audioBlob: Blob): Promise<string> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY
  if (!apiKey) throw new Error('Groq API key not configured (VITE_GROQ_API_KEY)')

  const file = new File([audioBlob], 'recording.wav', { type: 'audio/wav' })

  const formData = new FormData()
  formData.append('file', file)
  formData.append('model', 'whisper-large-v3')
  // Do NOT set language — auto-detect handles Tamil+English code-switching better.
  // Prompt should only contain vocabulary hints, NOT descriptions.
  // Whisper uses this to prime its decoder — descriptive text gets hallucinated.
  formData.append(
    'prompt',
    'Paracetamol, Amoxicillin, Cetirizine, Ondansetron, Doxycycline, Metronidazole, Fipronil, Rabies, Parvo, Ehrlichiosis, vaccination, deworming, consultation, blood test, morning, afternoon, evening, night, tablet, injection.',
  )
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

// ─── Audio Chunking ─────────────────────────────────────────────────────

/**
 * Split an audio blob into ~30-second WAV chunks using the Web Audio API.
 * Each chunk is a standalone WAV file that Whisper can process independently.
 */
async function splitAudioIntoChunks(audioBlob: Blob): Promise<Blob[]> {
  const arrayBuffer = await audioBlob.arrayBuffer()
  const audioContext = new AudioContext()

  let audioBuffer: AudioBuffer
  try {
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
  } catch {
    // If decode fails (rare), fall back to sending the original blob
    await audioContext.close()
    return [audioBlob]
  }

  const totalDuration = audioBuffer.duration
  const sampleRate = audioBuffer.sampleRate
  const numberOfChannels = audioBuffer.numberOfChannels

  // If short enough, just convert to WAV and return as single chunk
  if (totalDuration <= CHUNK_DURATION_SEC + 5) {
    const wav = audioBufferToWav(audioBuffer)
    await audioContext.close()
    return [wav]
  }

  const chunks: Blob[] = []

  for (let start = 0; start < totalDuration; start += CHUNK_DURATION_SEC) {
    const end = Math.min(start + CHUNK_DURATION_SEC, totalDuration)
    const startSample = Math.floor(start * sampleRate)
    const endSample = Math.floor(end * sampleRate)
    const length = endSample - startSample

    if (length <= 0) continue

    // Extract this segment from the full audio buffer
    const chunkBuffer = audioContext.createBuffer(numberOfChannels, length, sampleRate)
    for (let ch = 0; ch < numberOfChannels; ch++) {
      const sourceData = audioBuffer.getChannelData(ch)
      const chunkData = chunkBuffer.getChannelData(ch)
      for (let i = 0; i < length; i++) {
        chunkData[i] = sourceData[startSample + i]
      }
    }

    chunks.push(audioBufferToWav(chunkBuffer))
  }

  await audioContext.close()
  return chunks.length > 0 ? chunks : [audioBlob]
}

/**
 * Convert an AudioBuffer to a WAV Blob.
 * WAV is universally supported by speech-to-text APIs and
 * trivial to create from raw PCM data.
 */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const length = buffer.length
  const bitsPerSample = 16
  const bytesPerSample = bitsPerSample / 8
  const blockAlign = numChannels * bytesPerSample
  const dataSize = length * blockAlign
  const headerSize = 44
  const totalSize = headerSize + dataSize

  const arrayBuffer = new ArrayBuffer(totalSize)
  const view = new DataView(arrayBuffer)

  // RIFF header
  writeString(view, 0, 'RIFF')
  view.setUint32(4, totalSize - 8, true)
  writeString(view, 8, 'WAVE')

  // fmt sub-chunk
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true) // sub-chunk size (PCM = 16)
  view.setUint16(20, 1, true) // audio format (PCM = 1)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true) // byte rate
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)

  // data sub-chunk
  writeString(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  // Interleave channels and write 16-bit PCM samples
  let offset = headerSize
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = buffer.getChannelData(ch)[i]
      const clamped = Math.max(-1, Math.min(1, sample))
      view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true)
      offset += bytesPerSample
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' })
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}
