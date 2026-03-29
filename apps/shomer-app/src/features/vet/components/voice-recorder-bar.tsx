import { useEffect, useState } from 'react'
import { Mic, Pause, Play, Square, Loader2, CheckCircle2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useVoiceRecorder } from '../services/use-voice-recorder'
import { transcribeAudio } from '../services/transcription-service'
import { extractConsultationData, type AIExtractedData } from '../services/ai-extract-service'

type ProcessingPhase = 'idle' | 'transcribing' | 'analyzing'

interface VoiceRecorderBarProps {
  diagnosisList: string[]
  medicineList: string[]
  serviceList: string[]
  onExtracted: (data: AIExtractedData, transcript: string) => void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function VoiceRecorderBar({
  diagnosisList,
  medicineList,
  serviceList,
  onExtracted,
}: VoiceRecorderBarProps) {
  const recorder = useVoiceRecorder()
  const [phase, setPhase] = useState<ProcessingPhase>('idle')
  const [processError, setProcessError] = useState<string | null>(null)
  const [lastTranscript, setLastTranscript] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  const isProcessing = phase !== 'idle'
  const isActive = recorder.state !== 'idle' || isProcessing

  // Auto-hide success indicator after 4s
  useEffect(() => {
    if (!showSuccess) return
    const t = setTimeout(() => setShowSuccess(false), 4000)
    return () => clearTimeout(t)
  }, [showSuccess])

  async function handleFinish() {
    setProcessError(null)
    setLastTranscript(null)
    setShowSuccess(false)
    const blob = await recorder.stop()
    if (!blob || blob.size === 0) {
      setProcessError('No audio recorded.')
      return
    }

    try {
      // Step 1: Transcribe
      setPhase('transcribing')
      const transcript = await transcribeAudio(blob)

      if (!transcript.trim()) {
        setProcessError('Could not detect any speech. Please try again.')
        setPhase('idle')
        return
      }

      setLastTranscript(transcript)

      // Step 2: AI extraction
      setPhase('analyzing')
      const extracted = await extractConsultationData(
        transcript,
        diagnosisList,
        medicineList,
        serviceList,
      )

      setPhase('idle')
      setShowSuccess(true)
      onExtracted(extracted, transcript)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Processing failed'
      setProcessError(msg)
      setPhase('idle')
    }
  }

  if (!isActive) {
    return (
      <div className="flex flex-col items-end gap-2">
        {(processError || recorder.error) && (
          <p className="text-[11px] text-danger text-right leading-snug max-w-[300px]">
            {processError || recorder.error}
          </p>
        )}
        {showSuccess && (
          <p className="flex items-center gap-1 text-[11px] text-success font-semibold">
            <CheckCircle2 size={12} />
            Fields auto-filled
          </p>
        )}
        {lastTranscript && !processError && (
          <div className="flex items-start gap-1.5 max-w-[320px] rounded-[4px] border border-border-base bg-surface px-2.5 py-2">
            <p className="text-[10px] text-muted leading-snug flex-1">
              <span className="font-semibold text-foreground">Transcript: </span>
              {lastTranscript.length > 120 ? lastTranscript.slice(0, 120) + '…' : lastTranscript}
            </p>
            <button
              type="button"
              onClick={() => setLastTranscript(null)}
              className="text-muted hover:text-foreground flex-shrink-0 mt-0.5"
            >
              <X size={10} />
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            setProcessError(null)
            setShowSuccess(false)
            recorder.start()
          }}
          className="flex items-center gap-1.5 rounded-[4px] bg-primary px-3 py-1.5 text-[12px] font-semibold text-white hover:opacity-85 transition-opacity"
        >
          <Mic size={13} />
          {lastTranscript ? 'Re-record' : 'Record'}
        </button>
      </div>
    )
  }

  // Processing state
  if (isProcessing) {
    return (
      <div className="flex items-center gap-2.5 rounded-[4px] border border-primary/30 bg-primary/5 px-3 py-1.5">
        <Loader2 size={14} className="text-primary animate-spin" />
        <span className="text-[12px] font-semibold text-primary">
          {phase === 'transcribing' ? 'Transcribing…' : 'Analyzing with AI…'}
        </span>
      </div>
    )
  }

  // Recording / Paused state
  return (
    <div className="flex items-center gap-2.5 rounded-[4px] border border-danger/30 bg-danger/5 px-3 py-1.5">
      {/* Red pulsing dot for recording */}
      {recorder.state === 'recording' && (
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-danger opacity-75 animate-ping" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-danger" />
        </span>
      )}
      {recorder.state === 'paused' && (
        <span className="h-2.5 w-2.5 rounded-full bg-warning" />
      )}

      {/* Timer */}
      <span className={cn(
        'text-[12px] font-bold tabular-nums min-w-[36px]',
        recorder.state === 'recording' ? 'text-danger' : 'text-warning',
      )}>
        {formatTime(recorder.elapsed)}
      </span>

      {/* Status label */}
      <span className="text-[11px] font-medium text-muted">
        {recorder.state === 'recording' ? 'Recording' : 'Paused'}
      </span>

      {/* Pause / Resume */}
      {recorder.state === 'recording' ? (
        <button
          type="button"
          onClick={recorder.pause}
          className="flex items-center justify-center h-6 w-6 rounded-full border border-border-base bg-surface hover:bg-surface-2 transition-colors"
          title="Pause"
        >
          <Pause size={11} className="text-foreground" />
        </button>
      ) : (
        <button
          type="button"
          onClick={recorder.resume}
          className="flex items-center justify-center h-6 w-6 rounded-full border border-border-base bg-surface hover:bg-surface-2 transition-colors"
          title="Resume"
        >
          <Play size={11} className="text-foreground ml-0.5" />
        </button>
      )}

      {/* Finish */}
      <button
        type="button"
        onClick={handleFinish}
        className="flex items-center gap-1 rounded-[4px] bg-primary px-2.5 py-1 text-[11px] font-semibold text-white hover:opacity-85 transition-opacity"
      >
        <Square size={9} />
        Finish
      </button>
    </div>
  )
}
