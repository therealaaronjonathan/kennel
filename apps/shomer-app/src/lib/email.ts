// Email service — stubbed pending backend implementation.
// TODO: Replace with a POST to the backend API (/api/email/checkin-confirmation).
//       SendGrid API key must live server-side, not in the client bundle.

export interface CheckInEmailData {
  to: string
  doctorName: string
  tokenDisplay: string
  complaints: string[]
  queueLink: string
}

export async function sendCheckInConfirmation(
  data: CheckInEmailData,
): Promise<void> {
  console.log('[email stub] sendCheckInConfirmation →', data)
  // When backend is ready:
  // await fetch('/api/email/checkin-confirmation', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(data),
  // })
}
