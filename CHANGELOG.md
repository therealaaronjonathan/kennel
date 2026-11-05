# Changelog

## [0.1.0.0] - 2026-11-06

### Added
- Front desk can print a 72 mm service bill from Check-out before payment, from the confirmation after the bill is fully paid, and from a History visit.
- After a bill is fully paid, Check-out stays open on a confirmation that asks whether to print the bill for the parent. A partial payment stays on the payment form.
- History shows Settled Overdues: visits whose original day is before From, that received money in the selected dates.
- Doctor Settings has an Overdue Visit tab for pinned billing defaults. Delete unpins the visit. Front-desk Settings does not show this tab.
- Settings and Admin can rename a diagnosis or a medicine, and can change a service or grooming service's name and price.

### Changed
- Check-out shows the remaining due as the main amount, with money already paid underneath. The panel shows Bill, Paid, and Due.
- Visit line prices can be changed on Check-out and during the consult. A new line still starts at the catalog price. The discount is taken off those prices.
- Changing the payment methods on a billed visit rewrites that visit's ledger rows. Each day's total stays on that day, so Total Earned does not move and By Method does.
