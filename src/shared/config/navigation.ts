import {
  LayoutDashboard,
  BookOpen,
  FileText,
  HelpCircle,
  AlertTriangle,
  Calendar,
} from 'lucide-react';

export const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Learn', href: '/learn', icon: BookOpen },
  { name: 'Resources', href: '/resources', icon: FileText },
  { name: 'Questions', href: '/questions', icon: HelpCircle },
  { name: 'Mistakes', href: '/mistakes', icon: AlertTriangle },
  { name: 'Exam Plan', href: '/dashboard', icon: Calendar },
] as const;

export const adminItems = [
  { name: 'Scanner', href: '/admin/scanner' },
  { name: 'Import', href: '/admin/import' },
] as const;
