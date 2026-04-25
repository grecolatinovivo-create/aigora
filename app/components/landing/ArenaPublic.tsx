'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ModeSelect from '@/app/components/modes/ModeSelect'
import LoginModal from '@/app/components/landing/LoginModal'

type SelectableMode = '2v2' | 'devil'

export default function ArenaPublic() {
  const router = useRouter()
  const [pendingMode, setPendingMode] = useState<SelectableMode | null>(null)

  return (
    <>
      <ModeSelect
        onSelect={(mode) => {
          if (mode === '2v2' || mode === 'devil') {
            setPendingMode(mode)
          }
        }}
        onClose={() => router.push('/')}
      />

      {pendingMode && (
        <LoginModal
          mode={pendingMode}
          onClose={() => setPendingMode(null)}
        />
      )}
    </>
  )
}
