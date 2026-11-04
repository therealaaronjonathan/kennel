import type { CompletedVisit } from '@/features/dashboard/services/use-completed-visits'
import type { PetHistoryVisit } from './use-pet-visit-history'

export function toCompletedVisit(v: PetHistoryVisit): CompletedVisit {
  return {
    id: v.id,
    tokenDisplay: v.tokenDisplay,
    petName: v.petName,
    ownerName: v.ownerName,
    ownerId: v.ownerId,
    petId: v.petId,
    doctorName: v.doctorName,
    doctorId: v.doctorId,
    complaints: v.complaints,
    otherComplaintText: v.otherComplaintText,
    consultationNotes: v.consultationNotes,
    isEmergency: v.isEmergency,
    status: v.status,
    services: v.services,
    billAmount: v.billAmount,
    discount: v.discount,
    payments: v.payments,
    amountPaid: v.amountPaid,
    petWeightKg: v.petWeightKg,
    petTemperatureF: v.petTemperatureF,
    completedAt: v.billedAt ?? v.updatedAt,
    date: v.date,
  }
}
