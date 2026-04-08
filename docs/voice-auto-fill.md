# Voice-to-Form Auto-Fill — Feature Documentation

## Overview

A **Record** button on the Vet Console allows the doctor to **speak** their consultation (in Tamil, English, or a mix), and AI automatically fills in the form fields — Diagnosis, Consultation Notes, Medicines, Vaccines, and Services. The doctor reviews, edits if needed, and clicks Mark Complete. The raw transcript is saved to Firestore for future reference.

**Problem:** Manually typing every field during a consultation takes 3–5 minutes.
**Solution:** ~30 seconds of speaking + quick review.

---

## AI Models Used

| Component | Model | Provider | Purpose |
|-----------|-------|----------|---------|
| **Speech-to-Text** | `whisper-large-v3` | Groq (free tier) | Converts doctor's voice to text. Supports Tamil, English, and code-switching. |
| **Text Extraction** | `llama-3.3-70b-versatile` | Groq (free tier) | Parses transcript to extract structured data (diagnoses, medicines, vaccines, services). |

**Why Groq?** Free tier, fast inference (~2-3s per request), and high-quality models.

---

## Architecture & Data Flow

```
┌─────────────┐
│  🎤 Doctor   │  Speaks in Tamil + English
│   speaks     │  (e.g., "Skin allergy irukku, Amoxicillin morning evening 5 days kudunga")
└──────┬───────┘
       │
       ▼
┌─────────────────────────────┐
│  Browser MediaRecorder API  │  Captures audio as WebM/Opus
│  (use-voice-recorder.ts)    │  Supports: Record / Pause / Resume / Stop
└──────┬──────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Audio Chunking (Web Audio API)      │  Splits long recordings into ~30s WAV segments
│  (transcription-service.ts)          │  Prevents Whisper hallucination on long audio
│                                      │
│  5 min recording → [0:00-0:30] [0:30-1:00] [1:00-1:30] ... (10 chunks)
└──────┬───────────────────────────────┘
       │  All chunks sent in parallel
       ▼
┌──────────────────────────────────────┐
│  Groq Whisper API                    │  Model: whisper-large-v3
│  (transcription-service.ts)          │  Auto-detects language (Tamil/English)
│                                      │  Vocabulary hints prime the decoder for
│                                      │  medical terms (Amoxicillin, Rabies, etc.)
│                                      │
│  Output: "The dog has skin allergy,  │
│  prescribe Amoxicillin morning       │
│  evening for 5 days..."              │
└──────┬───────────────────────────────┘
       │  Combined transcript
       ▼
┌──────────────────────────────────────┐
│  Groq Llama 3.3 70B API             │  Temperature: 0.1 (low randomness)
│  (ai-extract-service.ts)            │  Response: JSON object
│                                      │
│  System prompt includes:             │
│  - Clinic's diagnosis list           │
│  - Clinic's medicine list            │
│  - Clinic's service list             │
│  - Tamil timing mappings             │
│  - English-only output rule          │
│                                      │
│  Output: {                           │
│    diagnoses: [...],                 │
│    consultationNotes: "...",         │
│    medicines: [...],                 │
│    vaccineName: "Rabies",            │
│    services: ["Consultation"]        │
│  }                                   │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Fuzzy Matching & Form Fill          │  Matches AI output to clinic's actual items
│  (consultation-view.tsx)             │  "Amoxicillin" → "Amoxicillin 250mg" ✓
│                                      │  Fills: diagnoses, notes, medicines,
│                                      │  timing checkboxes, vaccines, services
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Doctor Reviews & Edits              │  Can manually change any field
│                                      │  Can re-record if needed
└──────┬───────────────────────────────┘
       │  Clicks "Mark Complete"
       ▼
┌──────────────────────────────────────┐
│  Firestore Write                     │  Saves all form data + transcript
│  (complete-visit.ts)                 │  Path: clinics/{id}/branches/{id}/visits/{id}
│                                      │  transcript field stored for future reference
└──────────────────────────────────────┘
```

---

## Files

All files are in `apps/shomer-app/src/features/vet/`:

### New Files

| File | Purpose |
|------|---------|
| `services/use-voice-recorder.ts` | React hook wrapping browser MediaRecorder API (record/pause/resume/stop) |
| `services/transcription-service.ts` | Sends audio to Groq Whisper. Includes audio chunking (splits long recordings into 30s WAV segments using Web Audio API) |
| `services/ai-extract-service.ts` | Sends transcript + clinic lists to Groq Llama 3.3. Returns structured JSON with diagnoses, medicines, vaccines, services |
| `components/voice-recorder-bar.tsx` | UI component for recording controls and processing status |

### Modified Files

| File | Change |
|------|--------|
| `components/consultation-view.tsx` | Integrated voice recorder, AI auto-fill handler with fuzzy matching, transcript state |
| `services/complete-visit.ts` | Added `transcript` field to `ConsultationFormData` and Firestore write |

### Config

| File | Change |
|------|--------|
| `.env` | Added `VITE_GROQ_API_KEY` (gitignored, not pushed) |

---

## Audio Chunking

Long recordings (>35 seconds) are automatically split into ~30-second WAV segments before transcription. This is critical because Whisper hallucinates and drops content on long bilingual audio.

**How it works:**
1. Full audio blob is decoded using Web Audio API (`AudioContext.decodeAudioData`)
2. PCM samples are split into 30-second segments
3. Each segment is encoded as a standalone WAV file (with proper RIFF/WAV headers)
4. All chunks are transcribed **in parallel** via `Promise.all`
5. Results are concatenated into a single transcript

**Performance:** Parallel transcription means chunked audio takes roughly the same time as a single request.

---

## AI Extraction Prompt

The system prompt sent to Llama 3.3 includes:

1. **Clinic's actual lists** — diagnoses, medicines, services configured in the clinic
2. **English-only rule** — ALL output must be in English, Tamil speech is translated (not transliterated)
3. **Tamil timing mappings** — காலை=morning, மதியம்=afternoon, மாலை=evening, இரவு=night
4. **Extraction rules** — specific instructions for each field type
5. **Services restriction** — only matches from the clinic's configured list (services have prices)

---

## Fuzzy Matching

AI-extracted names are matched to the clinic's database using a two-tier strategy:

```
1. Exact match (case-insensitive):  "Amoxicillin" === "Amoxicillin"  ✓
2. Partial match (includes):        "Amoxicillin" ⊂ "Amoxicillin 250mg"  ✓
3. No match:                        Creates custom entry (diagnoses/medicines only)
```

Services require a match — unmatched services are skipped because they need prices.

---

## Transcript Storage

The raw Whisper transcript is saved to Firestore when the doctor clicks Mark Complete:

```
clinics/{clinicId}/branches/{branchId}/visits/{visitId}
{
  status: "completed",
  consultationNotes: "...",
  services: [...],
  transcript: "The dog has skin allergy...",  ← saved here
  billAmount: 500,
  updatedAt: ...
}
```

Not displayed in the UI — stored silently for future reference, auditing, or analytics.

---

## Environment Setup

The Groq API key must be set in `apps/shomer-app/.env`:

```
VITE_GROQ_API_KEY=gsk_xxxxxxxxxxxxx
```

Get a free API key at [console.groq.com](https://console.groq.com).

> **Security note:** The API key is currently in the frontend bundle. For production, it should be proxied through a backend Cloud Function.

---

## API Usage & Limits

| API | Model | Free Tier Limit | Typical Usage |
|-----|-------|----------------|---------------|
| Whisper | whisper-large-v3 | ~12,000 audio-seconds/day | ~30 consultations × 2 min = 3,600s/day ✓ |
| Chat | llama-3.3-70b-versatile | 100k tokens/day | ~30 consultations × 2k tokens = 60k/day ✓ |
