import { deleteField, doc, serverTimestamp, writeBatch, type WriteBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  amountDue,
  serviceSubtotal,
  type DiscountApprover,
  type VisitDiscount,
} from './discount'

export function discountVisitFields(discount: VisitDiscount | null): Record<string, unknown> {
  return { discount: discount ?? deleteField() }
}

/** Staff-only approver record. The visit doc stays free of the name. */
export function stageDiscountApproval(
  batch: WriteBatch,
  clinicId: string,
  branchId: string,
  visitId: string,
  discount: VisitDiscount | null,
  approver: DiscountApprover | null,
  pinned: boolean,
  billAmount: number,
): void {
  const approvalRef = doc(
    db,
    `clinics/${clinicId}/branches/${branchId}/discountApprovals/${visitId}`,
  )
  if (discount) {
    if (!approver) throw new Error('Choose who approved this discount.')
    batch.set(approvalRef, {
      visitId,
      approvedById: approver.id,
      approvedByName: approver.name,
      approvedByRole: approver.role,
      updatedAt: serverTimestamp(),
    })
  } else {
    batch.delete(approvalRef)
  }
  if (pinned) {
    batch.update(doc(db, `clinics/${clinicId}/branches/${branchId}/billingDefaults/${visitId}`), {
      billAmount,
    })
  }
}

/** Write or clear the staff-only approver while a doctor is still in the consult. */
export async function saveDiscountApprover(
  clinicId: string,
  branchId: string,
  visitId: string,
  discount: VisitDiscount | null,
  approver: DiscountApprover | null,
): Promise<void> {
  const batch = writeBatch(db)
  stageDiscountApproval(batch, clinicId, branchId, visitId, discount, approver, false, 0)
  await batch.commit()
}

/** Publish the service lines and discount so the summary link matches the desk. */
export async function saveVisitBill(
  clinicId: string,
  branchId: string,
  visitId: string,
  services: { serviceId: string; name: string; price: number; quantity?: number }[],
  discount: VisitDiscount | null,
  approver: DiscountApprover | null,
  pinned: boolean,
): Promise<number> {
  const billAmount = amountDue(serviceSubtotal(services), discount)
  const batch = writeBatch(db)
  batch.update(doc(db, `clinics/${clinicId}/branches/${branchId}/visits/${visitId}`), {
    services,
    billAmount,
    ...discountVisitFields(discount),
    updatedAt: serverTimestamp(),
  })
  stageDiscountApproval(batch, clinicId, branchId, visitId, discount, approver, pinned, billAmount)
  await batch.commit()
  return billAmount
}
