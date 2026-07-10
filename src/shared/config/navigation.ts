import {
  LayoutDashboard,
  BookOpen,
  FileText,
  HelpCircle,
  AlertTriangle,
  Calendar,
  Brain,
  Calculator,
  Grid3X3,
} from 'lucide-react';

export const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Learn', href: '/learn', icon: BookOpen },
  { name: 'Resources', href: '/resources', icon: FileText },
  { name: 'Questions', href: '/questions', icon: HelpCircle },
  { name: 'Flashcards', href: '/flashcards', icon: Brain },
  { name: 'Formulas', href: '/formulas', icon: Calculator },
  { name: 'LOS Tracker', href: '/los-tracker', icon: Grid3X3 },
  { name: 'Mistakes', href: '/mistakes', icon: AlertTriangle },
  { name: 'Exam Plan', href: '/exam-plan', icon: Calendar },
] as const;

export const adminItems = [
  { name: 'Scanner', href: '/admin/scanner' },
  { name: 'Import', href: '/admin/import' },
] as const;
