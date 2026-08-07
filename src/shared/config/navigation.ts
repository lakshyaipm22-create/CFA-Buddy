import {
  LayoutDashboard,
  BookOpen,
  HelpCircle,
  AlertTriangle,
  Brain,
  BarChart3,
  ListChecks,
  Sparkles,
  GitBranch,
  MessageCircle,
  type LucideIcon,
} from 'lucide-react';

export interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

export interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

export const navigationGroups: NavigationGroup[] = [
  {
    label: 'Main',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Questions', href: '/questions', icon: HelpCircle },
      { name: 'Learn', href: '/learn', icon: BookOpen },
      { name: 'Concept Map', href: '/learn/concepts', icon: GitBranch },
      { name: 'AI Tutor', href: '/learn/tutor', icon: MessageCircle },
      { name: 'Flashcards', href: '/flashcards', icon: Brain },
    ],
  },
  {
    label: 'Practice',
    items: [
      { name: 'Adaptive', href: '/practice/adaptive', icon: Sparkles },
    ],
  },
  {
    label: 'Review',
    items: [
      { name: 'Review', href: '/review', icon: ListChecks },
      { name: 'Mistakes', href: '/mistakes', icon: AlertTriangle },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { name: 'Insights', href: '/insights', icon: BarChart3 },
    ],
  },
];

/** Flat array of all navigation items for backward compatibility */
export const navigationItems = navigationGroups.flatMap((group) => group.items);

/** Mobile bottom nav - 5 key quick-access items */
export const mobileNavItems: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Questions', href: '/questions', icon: HelpCircle },
  { name: 'Flashcards', href: '/flashcards', icon: Brain },
  { name: 'Learn', href: '/learn', icon: BookOpen },
  { name: 'Review', href: '/review', icon: ListChecks },
];

/** Route segment to human-readable name mapping for breadcrumbs */
export const routeSegmentLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  learn: 'Learn',
  concepts: 'Concept Map',
  tutor: 'AI Tutor',
  resources: 'Resources',
  questions: 'Questions',
  practice: 'Practice',
  adaptive: 'Adaptive Learning',
  review: 'Review',
  flashcards: 'Flashcards',
  formulas: 'Formulas',
  revision: 'Revision',
  insights: 'Insights',
  'weekly-report': 'Weekly Report',
  'los-tracker': 'LOS Tracker',
  mistakes: 'Mistakes',
  'exam-plan': 'Exam Plan',
  'mock-exam': 'Mock Exam',
  social: 'Community',
  profile: 'Profile',
  settings: 'Settings',
  data: 'Data Management',
  admin: 'Admin',
  scanner: 'Scanner',
  import: 'Import',
  attempts: 'Attempts',
  session: 'Session',
};

export const adminItems = [
  { name: 'Scanner', href: '/admin/scanner' },
  { name: 'Import', href: '/admin/import' },
] as const;
