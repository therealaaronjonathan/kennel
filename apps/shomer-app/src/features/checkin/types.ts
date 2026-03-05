import type { Timestamp } from 'firebase/firestore'

export interface PetOwner {
  id: string
  clinicId: string
  branchId: string
  name: string
  phone: string
  email?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface Pet {
  id: string
  ownerId: string
  clinicId: string
  branchId: string
  name: string
  species: 'dog' | 'cat' | 'bird' | 'rabbit' | 'other'
  breed?: string
  age?: number
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface Doctor {
  id: string
  clinicId: string
  branchId: string
  name: string
  isActive: boolean
}

export interface CheckinFormData {
  petId: string
  complaints: string[]
  doctorId: string
  isEmergency: boolean
}

export interface NewOwnerFormData {
  ownerName: string
  phone: string
  email: string
  petName: string
  species: 'dog' | 'cat' | 'bird' | 'rabbit' | 'other'
  breed: string
  age: string
}

export interface CheckinResult {
  visitId: string
  tokenNumber: number
  tokenDisplay: string
  doctorName: string
  doctorId: string
  complaints: string[]
  isEmergency: boolean
  ownerEmail?: string
}

export const COMPLAINTS = [
  'Vomiting',
  'Diarrhea',
  'Lethargy',
  'Loss of appetite',
  'Limping',
  'Skin irritation',
  'Ear scratching',
  'Eye discharge',
  'Coughing',
  'Sneezing',
  'Difficulty breathing',
  'Excessive thirst',
  'Frequent urination',
  'Weight loss',
  'Swelling',
  'Bleeding',
  'Seizures',
  'Aggression',
  'Anxiety',
  'Routine checkup',
  'Vaccination',
  'Deworming',
  'Dental issue',
  'Post-surgery followup',
  'Other',
] as const

export type Complaint = (typeof COMPLAINTS)[number]
