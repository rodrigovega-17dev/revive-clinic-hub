import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { ThemeToggle } from './ThemeToggle'
import { LanguageSelector } from './LanguageSelector'
import { useClinic } from '@/hooks/useClinic'
import { useSubscriptionRedirect } from '@/hooks/useSubscriptionRedirect'
import { useTranslation } from 'react-i18next'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { data: clinic } = useClinic();
  const { t } = useTranslation();
  
  // Check subscription status and redirect if needed
  useSubscriptionRedirect();

  // Get clinic display name
  const getClinicDisplayName = () => {
    return clinic?.name || t('sidebar.fallbackClinic');
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-border bg-background flex items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-foreground">{getClinicDisplayName()}</h1>
          </div>
          <div className="flex items-center space-x-4">
            <LanguageSelector />
            <ThemeToggle />
          </div>
        </header>
        
        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
