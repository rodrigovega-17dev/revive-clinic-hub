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
    <div className="flex h-screen bg-background">
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
        <header className="h-16 border-b border-border bg-background flex items-center justify-between px-4 md:px-6 shrink-0">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg md:text-xl font-semibold text-foreground truncate">{getClinicDisplayName()}</h1>
          </div>
          <div className="flex items-center space-x-2 md:space-x-4">
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
