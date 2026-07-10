import { Sidebar } from '@/shared/components/layout/sidebar';
import { Header } from '@/shared/components/layout/header';
import { SearchModal } from '@/features/search/components/search-modal';
import { KeyboardShortcutsProvider } from './keyboard-shortcuts-provider';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--background)' }}>
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
      <SearchModal />
      <KeyboardShortcutsProvider />
    </div>
  );
}
