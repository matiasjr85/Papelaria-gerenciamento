import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { Sidebar } from '@/components/layout/Sidebar'
import { UiProvider } from '@/components/ui/UiProvider'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <UiProvider>
      <div className="flex min-h-screen">
        <Sidebar user={{ nome: session.nome, papelaria: session.papelaria }} />
        <main
          className="flex-1 min-w-0 overflow-auto"
          style={{ background: 'var(--bg)' }}
        >
          <div className="p-4 md:p-6 page-enter">
            {children}
          </div>
        </main>
      </div>
    </UiProvider>
  )
}
