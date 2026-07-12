import React from 'react';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import NotificationBell from '@/components/NotificationBell';
import { logoutAction } from '@/actions/auth';
import ChatWidget from '@/components/ChatWidget';
import { 
  LayoutDashboard, 
  Leaf, 
  Users, 
  Scale, 
  Trophy, 
  FileText, 
  Settings, 
  LogOut, 
  Shield, 
  User as UserIcon,
  ChevronRight
} from 'lucide-react';
import LogoutButton from '@/components/LogoutButton';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  color: string;
  roles?: string[];
}

const navItems: SidebarItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, color: 'text-blue-500' },
  { name: 'Environmental', href: '/environmental', icon: Leaf, color: 'text-emerald-500' },
  { name: 'Social', href: '/social', icon: Users, color: 'text-amber-500' },
  { name: 'Governance', href: '/governance', icon: Scale, color: 'text-blue-500' },
  { name: 'Gamification', href: '/gamification', icon: Trophy, color: 'text-violet-500' },
  { name: 'Reports', href: '/reports', icon: FileText, color: 'text-rose-500', roles: ['ADMIN', 'MANAGER', 'AUDITOR'] },
  { name: 'Settings', href: '/settings', icon: Settings, color: 'text-slate-500', roles: ['ADMIN'] },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }

  // Fetch recent notifications
  const dbNotifications = await prisma.notification.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const formattedNotifications = dbNotifications.map(n => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    read: n.read,
    link: n.link,
    createdAt: n.createdAt,
  }));

  // Filter items by role
  const allowedNavItems = navItems.filter(item => {
    if (!item.roles) return true;
    return item.roles.includes(session.role);
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans overflow-x-hidden">
      {/* 1. Top Navbar Header (Replacing Sidebar) */}
      <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 lg:px-8">
        {/* Logo Section */}
        <Link href="/" className="flex items-center gap-2">
          <Leaf className="w-6 h-6 text-emerald-500 animate-pulse" />
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent hidden sm:inline-block">
            EcoSphere AI
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 mx-4 overflow-x-auto">
          {allowedNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all text-sm font-medium group whitespace-nowrap"
              >
                <Icon className={`w-4 h-4 ${item.color} group-hover:scale-110 transition-transform`} />
                <span className="hidden lg:inline-block">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Controls */}
        <div className="flex items-center gap-3">
          <NotificationBell 
            initialNotifications={formattedNotifications} 
            userId={session.userId} 
          />
          
          <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
            <div className="hidden sm:flex flex-col items-end text-right">
              <span className="text-xs font-bold text-slate-900 leading-none">{session.name}</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mt-0.5">
                <Shield className="w-3 h-3 text-emerald-500" />
                {session.role}
              </span>
            </div>
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200">
              <UserIcon className="w-4 h-4 text-emerald-600" />
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* 2. Main Content Wrapper */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-8">
        {children}
      </main>

      {/* 3. Mobile Bottom Nav Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-slate-200 bg-white/95 backdrop-blur-xl flex items-center justify-around px-2 z-40">
        {allowedNavItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center w-12 h-12 rounded-lg text-slate-600 hover:text-emerald-600 transition-all"
            >
              <Icon className={`w-5 h-5 ${item.color}`} />
              <span className="text-[9px] mt-0.5 font-medium">{item.name}</span>
            </Link>
          );
        })}
        {/* Mobile Settings/Admin indicator if allowed */}
        {session.role === 'ADMIN' && (
          <Link
            href="/settings"
            className="flex flex-col items-center justify-center w-12 h-12 rounded-lg text-slate-600 hover:text-emerald-600 transition-all"
          >
            <Settings className="w-5 h-5 text-slate-500" />
            <span className="text-[9px] mt-0.5 font-medium">Settings</span>
          </Link>
        )}
      </nav>

      {/* Floating AI Chat Assistant - Global */}
      <ChatWidget />
    </div>
  );
}
