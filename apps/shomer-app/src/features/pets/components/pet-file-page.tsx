import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useClinic } from '@/features/clinic'
import { usePetFile } from '../services/use-pet-file'
import { usePetVisitHistory, type PetHistoryVisit } from '../services/use-pet-visit-history'
import { LastVisitCard } from './last-visit-card'
import { PetVisitKpis } from './pet-visit-kpis'
import { PetVisitList } from './pet-visit-list'
import { PetInformationTab } from './pet-information-tab'
import { PetVisitDetailOverlay } from './pet-visit-detail-overlay'

type Tab = 'info' | 'visits'

export function PetFilePage() {
  const { petId } = useParams<{ petId: string }>()
  const navigate = useNavigate()
  const { clinicId } = useClinic()
  const { data, isLoading, error } = usePetFile(clinicId, petId)
  const [tab, setTab] = useState<Tab>('visits')
  const [branchFilter, setBranchFilter] = useState<string | null>(null)
  const [selected, setSelected] = useState<PetHistoryVisit | null>(null)

  const history = usePetVisitHistory(clinicId, petId ?? null, branchFilter)

  const filterBranches = useMemo(() => {
    const withVisits = new Set(history.allVisits.map((v) => v.branchId))
    return history.branches.filter((b) => b.isActive || withVisits.has(b.id))
  }, [history.branches, history.allVisits])

  const showBranchFilter = filterBranches.length > 1

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="h-[52px] border-b border-border-base bg-surface flex items-center gap-3 px-6 flex-shrink-0">
        <button
          type="button"
          onClick={() => navigate('/reception/pets')}
          className="flex items-center gap-1.5 text-[12px] font-semibold text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft size={13} />
          Pet Search
        </button>
        <h1 className="font-display text-[18px] font-bold text-foreground leading-none truncate">
          {data?.pet.name ?? 'Pet'}
        </h1>
      </header>

      {isLoading ? (
        <p className="px-6 py-8 text-[12px] text-muted">Loading…</p>
      ) : error || !data ? (
        <p className="px-6 py-8 text-[12px] text-danger">Pet not found.</p>
      ) : (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="flex flex-col min-h-0 overflow-hidden w-full">
            <div className="px-6 pt-4 flex-shrink-0">
              <div className="flex gap-1 border-b border-border-base">
                {(
                  [
                    { key: 'visits', label: 'Visits' },
                    { key: 'info', label: 'Pet information' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setTab(item.key)
                      if (item.key === 'info') setSelected(null)
                    }}
                    className={cn(
                      'px-4 py-2.5 text-[13px] font-semibold transition-colors border-b-2 -mb-px',
                      tab === item.key
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted hover:text-foreground',
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {tab === 'info' && <PetInformationTab pet={data.pet} owner={data.owner} />}

              {tab === 'visits' && (
                <>
                  {showBranchFilter && (
                    <div className="flex flex-wrap gap-1.5">
                      <FilterChip
                        label="All branches"
                        active={branchFilter === null}
                        onClick={() => {
                          setBranchFilter(null)
                          setSelected(null)
                        }}
                      />
                      {filterBranches.map((b) => (
                        <FilterChip
                          key={b.id}
                          label={b.name}
                          active={branchFilter === b.id}
                          onClick={() => {
                            setBranchFilter(b.id)
                            setSelected(null)
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {history.loading ? (
                    <p className="text-[12px] text-muted">Loading visits…</p>
                  ) : history.error ? (
                    <p className="text-[12px] text-danger">{history.error}</p>
                  ) : (
                    <>
                      <PetVisitKpis kpis={history.kpis} />
                      {history.lastVisit && (
                        <LastVisitCard
                          visit={history.lastVisit}
                          branchName={history.lastVisitBranchName}
                          clinicId={clinicId}
                        />
                      )}
                      <PetVisitList
                        visits={history.visits}
                        selectedId={selected?.id}
                        onSelect={setSelected}
                      />
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {selected && tab === 'visits' && clinicId && (
            <PetVisitDetailOverlay
              visit={selected}
              clinicId={clinicId}
              onClose={() => setSelected(null)}
            />
          )}
        </div>
      )}
    </div>
  )
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-3 py-1 text-[12px] font-semibold border transition-colors',
        active
          ? 'bg-primary text-white border-primary'
          : 'bg-surface text-muted border-border-base hover:text-foreground',
      )}
    >
      {label}
    </button>
  )
}
