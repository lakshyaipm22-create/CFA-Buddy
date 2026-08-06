import {
  LayoutDashboard,
  BookOpen,
  FileText,
  HelpCircle,
  Repeat,
  AlertTriangle,
  Calendar,
  Brain,
  Calculator,
  Grid3X3,
  RotateCw,
  BarChart3,
  ListChecks,
  FileBarChart,
  GraduationCap,
  Target,
  TrendingUp,
  ClipboardList,
  ClipboardCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

export interface NavigationGroup {
  label: string;
  icon: LucideIcon;
  items: NavigationItem[];
}

export const navigationGroups: NavigationGroup[] = [
  {
    label: 'Progress',
    icon: TrendingUp,
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Insights', href: '/insights', icon: BarChart3 },
      { name: 'Weekly Report', href: '/weekly-report', icon: FileBarChart },
      { name: 'LOS Tracker', href: '/los-tracker', icon: Grid3X3 },
    ],
  },
  {
    label: 'Study',
    icon: GraduationCap,
    items: [
      { name: 'Learn', href: '/learn', icon: BookOpen },
      { name: 'Resources', href: '/resources', icon: FileText },
      { name: 'Formulas', href: '/formulas', icon: Calculator },
    ],
  },
  {
    label: 'Practice',
    icon: Target,
    items: [
      { name: 'Questions', href: '/questions', icon: HelpCircle },
      { name: 'Practice', href: '/practice', icon: Repeat },
      { name: 'Flashcards', href: '/flashcards', icon: Brain },
      { name: 'Mock Exam', href: '/mock-exam', icon: ClipboardCheck },
    ],
  },
  {
    label: 'Planning',
    icon: ClipboardList,
    items: [
      { name: 'Exam Plan', href: '/exam-plan', icon: Calendar },
      { name: 'Revision', href: '/revision', icon: RotateCw },
      { name: 'Review', href: '/review', icon: ListChecks },
      { name: 'Mistakes', href: '/mistakes', icon: AlertTriangle },
    ],
  },
  {
    label: 'Community',
    icon: Users,
    items: [
      { name: 'Community', href: '/social', icon: Users },
    ],
  },
];

/** Flat array of all navigation items for backward compatibility */
export const navigationItems = navigationGroups.flatMap((group) => group.items);

/** Mobile bottom nav - 5 key quick-access items */
export const mobileNavItems: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Questions', href: '/questions', icon: HelpCircle },
  { name: 'Practice', href: '/practice', icon: Repeat },
  { name: 'Learn', href: '/learn', icon: BookOpen },
  { name: 'Flashcards', href: '/flashcards', icon: Brain },
];

/** Route segment to human-readable name mapping for breadcrumbs */
export const routeSegmentLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  learn: 'Learn',
  resources: 'Resources',
  questions: 'Questions',
  practice: 'Practice',
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
