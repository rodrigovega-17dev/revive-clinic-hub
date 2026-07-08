import { ReactNode, useState } from 'react'
import { Sidebar } from './Sidebar'
import { ThemeToggle } from './ThemeToggle'
import { LanguageSelector } from './LanguageSelector'
import { useClinic } from '@/hooks/useClinic'
import { useSubscriptionRedirect } from '@/hooks/useSubscriptionRedirect'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { data: clinic } = useClinic();
  const { t } = useTranslation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useSubscriptionRedirect();

  const getClinicDisplayName = () => {
    return clinic?.name || t('sidebar.fallbackClinic');
  };

  return (
    <div className="flex h-[100dvh] bg-background">
      {/* Mobile backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <Sidebar mobileOpen={mobileSidebarOpen} onMobileClose={() => setMobileSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="min-h-16 border-b border-border bg-background flex items-center justify-between gap-2 px-3 md:px-6 pt-[env(safe-area-inset-top)] shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden shrink-0"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-base sm:text-lg md:text-xl font-semibold text-foreground truncate min-w-0">{getClinicDisplayName()}</h1>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-4 shrink-0">
            <LanguageSelector />
            <ThemeToggle />
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-3 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
