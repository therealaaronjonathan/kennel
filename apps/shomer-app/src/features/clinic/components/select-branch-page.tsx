import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { MapPin, Phone, Building2 } from 'lucide-react'
import { db } from '@/lib/firebase'
import { useClinic } from '../hooks/use-clinic'

function getRoleDestination(role: string | null): string {
  if (role === 'admin' || role === 'owner') return '/admin'
  if (role === 'doctor') return '/vet'
  return '/reception/home'
}

export function SelectBranchPage() {
  const navigate = useNavigate()
  const { clinicId, branchIds, branchName, role, selectBranch, loading } = useClinic()

  // If only 1 branch the provider auto-selected it already, redirect
  useEffect(() => {
    if (loading) return
    if (branchIds.length === 1 && branchName) {
      navigate(getRoleDestination(role), { replace: true })
    }
  }, [loading, branchIds.length, branchName, role, navigate])

  if (loading) {
    return <div className="h-screen" style={{ backgroundColor: '#FEFAFF' }} />
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ backgroundColor: '#FEFAFF' }}
    >
      {/* Left purple panel — matches login page */}
      <div
        aria-hidden="true"
        className="hidden lg:flex lg:w-[420px] xl:w-[480px] flex-shrink-0 flex-col justify-between px-12 py-14 relative overflow-hidden"
        style={{
          backgroundColor: '#9979FF',
          backgroundImage: 'repeating-linear-gradient(-45deg, rgba(250,232,199,0.05) 0px, rgba(250,232,199,0.05) 1px, transparent 1px, transparent 32px)',
        }}
      >
        <img
          src="/logos/shomer-full-icon.png"
          alt=""
          className="h-20 w-auto object-contain object-left select-none -ml-3"
        />
        <div>
          <div className="mb-7 h-px w-12" style={{ backgroundColor: 'rgba(250, 232, 199, 0.4)' }} />
          <p
            className="text-[46px] xl:text-[54px] font-bold leading-[1.05] mb-5"
            style={{ fontFamily: '"BC Alphapipe", Georgia, serif', color: '#FAE8C7' }}
          >
            Which branch<br />today?
          </p>
          <p className="text-[14px] font-semibold" style={{ color: 'rgba(250, 232, 199, 0.55)' }}>
            Select your working location for this session.
          </p>
        </div>
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.12em]"
          style={{ color: 'rgba(250, 232, 199, 0.35)' }}
        >
          Shomer © 2026
        </p>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center px-8 py-12">
        <div className="w-full max-w-[400px]">

          {/* Mobile logo */}
          <div className="lg:hidden mb-10">
            <img
              src="/logos/shomer-full-icon.png"
              alt="Shomer"
              className="h-10 w-auto object-contain object-left select-none -ml-1"
            />
          </div>

          <div className="mb-8">
            <h1
              className="text-[48px] font-bold leading-none mb-3"
              style={{ fontFamily: '"BC Alphapipe", Georgia, serif', color: '#1A1825' }}
            >
              Select branch.
            </h1>
            <p className="text-[14px] font-semibold" style={{ color: '#6B6478' }}>
              Choose the location you're working at today
            </p>
          </div>

          <div className="space-y-3">
            {branchIds.map((bid) => (
              <BranchCard
                key={bid}
                clinicId={clinicId!}
                branchId={bid}
                onSelect={() => {
                  selectBranch(bid)
                  navigate(getRoleDestination(role), { replace: true })
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

interface BranchData {
  name: string
  address?: string
  phone?: string
}

function BranchCard({
  clinicId,
  branchId,
  onSelect,
}: {
  clinicId: string
  branchId: string
  onSelect: () => void
}) {
  const [branch, setBranch] = useState<BranchData | null>(null)

  useEffect(() => {
    getDoc(doc(db, `clinics/${clinicId}/branches/${branchId}`)).then((snap) => {
      if (snap.exists()) {
        const d = snap.data()
        setBranch({ name: d.name ?? branchId, address: d.address, phone: d.phone })
      } else {
        setBranch({ name: branchId })
      }
    })
  }, [clinicId, branchId])

  if (!branch) {
    return (
      <div
        className="rounded-[4px] border px-5 py-4 animate-pulse h-[68px]"
        style={{ backgroundColor: '#F4F0FA', borderColor: '#EDE8F5' }}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full text-left rounded-[4px] border px-5 py-4 transition-colors"
      style={{ backgroundColor: '#ffffff', borderColor: 'rgba(26, 24, 37, 0.14)' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#9979FF'
        e.currentTarget.style.backgroundColor = '#F4F0FA'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(26, 24, 37, 0.14)'
        e.currentTarget.style.backgroundColor = '#ffffff'
      }}
    >
      <div className="flex items-start gap-4">
        <div
          className="mt-0.5 flex-shrink-0 h-9 w-9 rounded-[4px] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(153, 121, 255, 0.1)' }}
        >
          <Building2 size={16} style={{ color: '#9979FF' }} />
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-bold" style={{ color: '#1A1825' }}>
            {branch.name}
          </p>
          {branch.address && (
            <div className="flex items-center gap-1 mt-1">
              <MapPin size={11} style={{ color: '#6B6478', flexShrink: 0 }} />
              <p className="text-[12px] truncate" style={{ color: '#6B6478' }}>
                {branch.address}
              </p>
            </div>
          )}
          {branch.phone && (
            <div className="flex items-center gap-1 mt-0.5">
              <Phone size={11} style={{ color: '#6B6478', flexShrink: 0 }} />
              <p className="text-[12px]" style={{ color: '#6B6478' }}>
                {branch.phone}
              </p>
            </div>
          )}
        </div>
      </div>
    </button>
  )
}
