import { Sidebar } from '@/shared/components/layout/sidebar';
import { Header } from '@/shared/components/layout/header';
import { Breadcrumbs } from '@/shared/components/layout/breadcrumbs';
import { MobileBottomNav } from '@/shared/components/layout/mobile-bottom-nav';
import { SearchModal } from '@/features/search/components/search-modal';
import { StudyTimer } from '@/features/study-timer/components/study-timer';
import { KeyboardShortcutsProvider } from './keyboard-shortcuts-provider';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--background)' }}>
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <Breadcrumbs />
        <main className="flex-1 overflow-y-auto p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>
      <MobileBottomNav />
      <SearchModal />
      <StudyTimer />
      <KeyboardShortcutsProvider />
    </div>
  );
}
