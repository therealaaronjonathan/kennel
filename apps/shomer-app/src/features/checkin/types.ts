import type { Timestamp } from 'firebase/firestore'

export interface PetOwner {
  id: string
  clinicId: string
  branchIds: string[]
  name: string
  phone: string
  altPhone?: string
  email?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface Pet {
  id: string
  ownerId: string
  clinicId: string
  name: string
  petNameLower: string
  species: 'dog' | 'cat' | 'bird' | 'rabbit' | 'other'
  speciesName?: string   // custom species label when species === 'other'
  breed?: string
  dateOfBirth?: string   // YYYY-MM-DD; age is derived at display time
  microchipNumber?: string
  color?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface PetWithOwner {
  pet: Pet
  owner: PetOwner
}

export interface Doctor {
  id: string
  clinicId: string
  branchIds: string[]
  name: string
  isActive: boolean
}

export interface CheckinFormData {
  petId: string
  service: string              // selected check-in service name, e.g. 'Consultation' | 'Grooming'
  complaints: string[]         // required when service === 'Consultation'
  groomingServices: string[]   // required when service === 'Grooming'
  doctorId: string
  isEmergency: boolean
}

export interface NewOwnerFormData {
  ownerName: string
  phone: string
  altPhone: string
  email: string
  petName: string
  species: 'dog' | 'cat' | 'other'
  speciesName: string   // required when species === 'other'
  breed: string
  dateOfBirth: string   // YYYY-MM-DD; empty string when not provided
  color: string
  microchipNumber: string
}

export interface CheckinResult {
  visitId: string
  tokenNumber: number
  tokenDisplay: string
  doctorName: string
  doctorId: string
  clinicId: string
  branchId: string
  complaints: string[]
  isEmergency: boolean
  ownerEmail?: string
  ownerName: string
  ownerPhone?: string
  petName: string
}

export const COMPLAINTS = [
  'Skin problem (itching/rashes/hair loss)',
  'Tick/flea infestation',
  'Vomiting',
  'Diarrhea/loose stools',
  'Not eating/loss of appetite',
  'Fever',
  'Lethargy/weakness',
  'Limping/lameness',
  'Wound/injury',
  'Swelling/lump',
  'Ear infection/discharge',
  'Eye discharge/redness',
  'Coughing',
  'Difficulty breathing',
  'Urinary problem (straining/blood)',
  'Vaccination',
  'Deworming',
  'Health checkup',
  'Follow-up visit',
  'Behavioral concern',
  'Weight issue',
  'Pregnancy/delivery related',
  'Post-surgery care',
  'Certificate request',
] as const

export type Complaint = (typeof COMPLAINTS)[number]
