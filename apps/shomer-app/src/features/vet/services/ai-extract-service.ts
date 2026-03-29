const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions'

export interface AIExtractedData {
  diagnoses: { name: string; notes: string }[]
  consultationNotes: string
  medicines: {
    name: string
    morning: boolean
    afternoon: boolean
    evening: boolean
    night: boolean
    days: number
  }[]
  vaccineName: string
  vaccineBatch: string
  vaccineNextDue: string
  services: string[]
}

const EMPTY_RESULT: AIExtractedData = {
  diagnoses: [],
  consultationNotes: '',
  medicines: [],
  vaccineName: '',
  vaccineBatch: '',
  vaccineNextDue: '',
  services: [],
}

function buildSystemPrompt(
  diagnosisList: string[],
  medicineList: string[],
  serviceList: string[],
): string {
  return `You are a veterinary consultation parser. You receive a transcription of a veterinarian speaking during a consultation. The doctor may speak in Tamil, English, or a mix of both (code-switching).

Your job is to extract structured data from the transcription and return it as JSON.

## Available options in this clinic

DIAGNOSES (match to these when possible):
${diagnosisList.length > 0 ? diagnosisList.map((d) => `- ${d}`).join('\n') : '- (none configured)'}

MEDICINES (match to these when possible):
${medicineList.length > 0 ? medicineList.map((m) => `- ${m}`).join('\n') : '- (none configured)'}

SERVICES (match to these when possible):
${serviceList.length > 0 ? serviceList.map((s) => `- ${s}`).join('\n') : '- (none configured)'}

## CRITICAL: ALL output MUST be in ENGLISH only
- Even if the doctor speaks in Tamil, ALL text in the JSON must be written in English
- Translate every Tamil word, phrase, or sentence to English
- Do NOT transliterate Tamil (e.g., do NOT write "romba itching iruku") — translate it to proper English (e.g., "severe itching observed")
- Diagnosis names, notes, consultation notes — everything must be professional English

## Extraction rules

1. **diagnoses**: Extract each diagnosis mentioned. Match to the clinic's list if the meaning is close (e.g., "skin problem" → "Skin allergy" if that's in the list). If no match, use the doctor's own words translated to English. Include any notes the doctor mentions about that specific diagnosis, translated to English.

2. **consultationNotes**: Summarize the doctor's overall clinical observations and findings in professional English. Translate ALL Tamil portions to English. Keep it concise and clinical.

3. **medicines**: Extract each prescribed medicine. Match to the clinic's list when possible. For dosage timing:
   - Tamil: "காலை/காலையில" = morning, "மதியம்" = afternoon, "மாலை/சாயங்காலம்" = evening, "இரவு/இரவில" = night
   - English: "morning", "afternoon", "evening", "night"
   - "இரண்டு வேளை" / "twice a day" = typically morning + evening
   - "மூன்று வேளை" / "thrice" = morning + afternoon + evening
   - For days: "5 நாள்" / "5 days" / "ஐந்து நாள்" = 5
   - Default to days: 1 if not mentioned

4. **vaccineName, vaccineBatch, vaccineNextDue**: Extract only if the doctor specifically mentions vaccination details. Leave empty strings if not mentioned. For nextDue, use YYYY-MM-DD format if a date is mentioned.

5. **services**: ONLY include services that match the clinic's service list above. If the doctor mentions a service not in the list, skip it. Do NOT add services that are not in the available list.

## Important
- ONLY return valid JSON, nothing else
- ALL text must be in English — no Tamil, no transliteration
- If a field has no data, use empty array [] or empty string ""
- Do NOT invent data that wasn't mentioned
- For medicines, if timing is not specified, default all timing to false and days to 1
- Fuzzy match to clinic lists (e.g., "amoxicillin" matches "Amoxicillin 250mg")

Return ONLY a JSON object with these exact keys:
{
  "diagnoses": [{"name": "string", "notes": "string"}],
  "consultationNotes": "string",
  "medicines": [{"name": "string", "morning": bool, "afternoon": bool, "evening": bool, "night": bool, "days": number}],
  "vaccineName": "string",
  "vaccineBatch": "string",
  "vaccineNextDue": "string",
  "services": ["string"]
}`
}

/**
 * Send transcribed text to Groq Llama 3 to extract structured consultation data.
 */
export async function extractConsultationData(
  transcript: string,
  diagnosisList: string[],
  medicineList: string[],
  serviceList: string[],
): Promise<AIExtractedData> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY
  if (!apiKey) throw new Error('Groq API key not configured (VITE_GROQ_API_KEY)')

  if (!transcript.trim()) return EMPTY_RESULT

  const systemPrompt = buildSystemPrompt(diagnosisList, medicineList, serviceList)

  const response = await fetch(GROQ_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Here is the transcription of the veterinary consultation:\n\n"${transcript}"\n\nExtract the structured data as JSON.`,
        },
      ],
      temperature: 0.1,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(`AI extraction failed (${response.status}): ${errorText}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('No response from AI')

  try {
    const parsed = JSON.parse(content) as Partial<AIExtractedData>
    return {
      diagnoses: Array.isArray(parsed.diagnoses) ? parsed.diagnoses : [],
      consultationNotes: parsed.consultationNotes ?? '',
      medicines: Array.isArray(parsed.medicines) ? parsed.medicines : [],
      vaccineName: parsed.vaccineName ?? '',
      vaccineBatch: parsed.vaccineBatch ?? '',
      vaccineNextDue: parsed.vaccineNextDue ?? '',
      services: Array.isArray(parsed.services) ? parsed.services : [],
    }
  } catch {
    throw new Error('Failed to parse AI response as JSON')
  }
}
