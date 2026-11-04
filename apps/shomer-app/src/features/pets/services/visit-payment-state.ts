export function visitPaymentState(paid = 0, total = 0): {
  label: string
  className: string
  badgeClass: string
} {
  if (total > 0 && paid >= total) {
    return {
      label: 'Paid',
      className: 'text-success',
      badgeClass: 'bg-success/10 border-success/25 text-success',
    }
  }
  if (paid > 0 && paid < total) {
    return {
      label: 'Partial',
      className: 'text-warning',
      badgeClass: 'bg-warning/10 border-warning/25 text-warning',
    }
  }
  if (total > 0) {
    return {
      label: 'Unpaid',
      className: 'text-warning',
      badgeClass: 'bg-warning/10 border-warning/25 text-warning',
    }
  }
  return {
    label: '—',
    className: 'text-muted',
    badgeClass: 'bg-surface-2 border-border-base text-muted',
  }
}
