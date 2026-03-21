import { useNavigate } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { useClinic } from '@/features/clinic'
import { useAllVisits } from '../services/use-all-visits'
import { useDutyRoster } from '@/features/settings/services/use-duty-roster'
import { useDoctors } from '@/features/checkin/services/use-doctors'

export function ReceptionHomePage() {
  const navigate = useNavigate()
  const { clinicId, branchId } = useClinic()
  const { visits, loading: visitsLoading } = useAllVisits(clinicId, branchId)
  const { onDuty } = useDutyRoster(clinicId, branchId)
  const { data: allDoctors = [] } = useDoctors(clinicId ?? '', branchId ?? '')

  const onDutyDoctors = allDoctors.filter((d) => onDuty.includes(d.id))

  function countFor(doctorId: string, statuses: string[]) {
    return visits.filter((v) => v.doctorId === doctorId && statuses.includes(v.status)).length
  }

  const todayTotal = visits.length
  const totalWaiting = visits.filter((v) => v.status === 'waiting').length
  const totalInProgress = visits.filter((v) => v.status === 'in-progress').length
  const totalCompleted = visits.filter((v) => v.status === 'completed' || v.status === 'billed').length

  // Sort visits for recent activity (last 6)
  const recent = [...visits]
    .filter((v) => v.status === 'completed' || v.status === 'billed')
    .sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0
      return b.createdAt.toMillis() - a.createdAt.toMillis()
    })
    .slice(0, 6)

  const labelClass = 'text-[10px] font-semibold uppercase tracking-[0.08em] text-muted'

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Top bar */}
      <header className="h-[52px] border-b border-border-base bg-surface flex items-center justify-between px-6 flex-shrink-0">
        <h1 className="font-display text-[18px] font-bold text-foreground leading-none">
          Today's Overview
        </h1>
        <button
          type="button"
          onClick={() => navigate('/reception/checkin')}
          className="rounded-[4px] bg-primary px-3 py-1.5 text-[12px] font-semibold text-white hover:opacity-85 transition-opacity"
        >
          + Check-in
        </button>
      </header>

      <div className="px-6 py-6 space-y-8">
        {/* No doctors on duty warning */}
        {onDuty.length === 0 && (
          <div className="flex items-start gap-3 rounded-[4px] border border-warning/30 bg-warning/5 px-4 py-3">
            <AlertCircle size={15} className="text-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-semibold text-foreground">No doctors on duty today</p>
              <p className="text-[12px] text-muted mt-0.5">
                Go to{' '}
                <button
                  type="button"
                  onClick={() => navigate('/reception/settings')}
                  className="text-primary font-semibold hover:underline"
                >
                  Settings
                </button>{' '}
                to mark doctors on duty before checking in patients.
              </p>
            </div>
          </div>
        )}

        {/* Summary numbers */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Today', value: todayTotal },
            { label: 'Waiting', value: totalWaiting },
            { label: 'In Progress', value: totalInProgress },
            { label: 'Completed', value: totalCompleted },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-[4px] border border-border-base bg-surface px-4 py-4">
              <p className={labelClass}>{label}</p>
              <p className="mt-2 text-[28px] font-bold text-foreground leading-none font-display">
                {visitsLoading ? '—' : value}
              </p>
            </div>
          ))}
        </div>

        {/* Doctors on duty */}
        <div className="space-y-3">
          <p className={labelClass}>Doctors on Duty</p>

          {onDutyDoctors.length === 0 ? (
            <p className="text-[13px] text-muted">
              No doctors marked on duty.{' '}
              <button
                type="button"
                onClick={() => navigate('/reception/settings')}
                className="text-primary font-semibold hover:underline"
              >
                Add in Settings →
              </button>
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {onDutyDoctors.map((doctor) => {
                const waiting = countFor(doctor.id, ['waiting'])
                const inProgress = countFor(doctor.id, ['in-progress'])
                const completed = countFor(doctor.id, ['completed', 'billed'])
                const initial = doctor.name.charAt(0).toUpperCase()
                const activeVisit = visits.find(
                  (v) => v.doctorId === doctor.id && v.status === 'in-progress',
                )

                return (
                  <div
                    key={doctor.id}
                    className="rounded-[4px] border border-border-base bg-surface px-4 py-4 space-y-3"
                  >
                    {/* Doctor header */}
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-[13px] font-bold text-primary">{initial}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-foreground truncate">
                          {doctor.name}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-success flex-shrink-0" />
                          <span className="text-[10px] font-medium text-muted">On duty</span>
                        </div>
                      </div>
                      {/* Active token badge */}
                      {activeVisit && (
                        <div className="flex-shrink-0 text-right">
                          <p className="text-[9px] font-semibold uppercase tracking-[0.06em] text-muted leading-none mb-0.5">
                            Now Serving
                          </p>
                          <p className="font-display text-[16px] font-bold text-warning leading-none">
                            {activeVisit.tokenDisplay}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border-base">
                      <div className="text-center">
                        <p className="text-[18px] font-bold text-foreground leading-none">
                          {visitsLoading ? '—' : waiting}
                        </p>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.06em] text-muted mt-1">
                          Waiting
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[18px] font-bold text-warning leading-none">
                          {visitsLoading ? '—' : inProgress}
                        </p>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.06em] text-muted mt-1">
                          Active
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[18px] font-bold text-success leading-none">
                          {visitsLoading ? '—' : completed}
                        </p>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.06em] text-muted mt-1">
                          Done
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent completions */}
        {recent.length > 0 && (
          <div className="space-y-3">
            <p className={labelClass}>Recent Completions</p>
            <div className="rounded-[4px] border border-border-base overflow-hidden">
              {recent.map((v, i) => (
                <div
                  key={v.id}
                  className={`flex items-center gap-4 px-4 py-2.5 bg-surface ${
                    i < recent.length - 1 ? 'border-b border-border-base' : ''
                  }`}
                >
                  <span className="text-[12px] font-bold text-primary w-[52px] flex-shrink-0">
                    {v.tokenDisplay}
                  </span>
                  <span className="text-[12px] font-semibold text-foreground flex-1 truncate">
                    {v.petName}
                  </span>
                  <span className="text-[11px] text-muted truncate">{v.ownerName}</span>
                  <span className="text-[11px] text-muted flex-shrink-0">{v.doctorName}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
