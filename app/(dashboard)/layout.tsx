import React from 'react';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import NotificationBell from '@/components/NotificationBell';
import { logoutAction } from '@/actions/auth';
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
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, color: 'text-blue-400' },
  { name: 'Environmental', href: '/environmental', icon: Leaf, color: 'text-emerald-400' },
  { name: 'Social', href: '/social', icon: Users, color: 'text-amber-400' },
  { name: 'Governance', href: '/governance', icon: Scale, color: 'text-blue-400' },
  { name: 'Gamification', href: '/gamification', icon: Trophy, color: 'text-violet-400' },
  { name: 'Reports', href: '/reports', icon: FileText, color: 'text-rose-400', roles: ['ADMIN', 'MANAGER', 'AUDITOR'] },
  { name: 'Settings', href: '/settings', icon: Settings, color: 'text-slate-400', roles: ['ADMIN'] },
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
    <div className="min-h-screen flex bg-slate-950 text-white font-sans overflow-x-hidden">
      {/* 1. Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 border-r border-slate-800 bg-slate-900/40 backdrop-blur-md z-30">
        <div className="flex items-center gap-2 px-6 h-16 border-b border-slate-800 bg-slate-950/20">
          <Leaf className="w-6 h-6 text-emerald-400 animate-pulse" />
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            EcoSphere AI
          </span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {allowedNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/40 border border-transparent hover:border-slate-800/60 transition-all text-sm group"
              >
                <Icon className={`w-4 h-4 ${item.color} group-hover:scale-110 transition-transform`} />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/20">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/60 border border-slate-800/40">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <UserIcon className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{session.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Shield className="w-2.5 h-2.5 text-slate-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{session.role}</span>
              </div>
            </div>
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* 2. Main Content Wrapper */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0 pb-20 md:pb-0">
        {/* Top Navbar */}
        <header className="h-16 border-b border-slate-800 bg-slate-950/40 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-20">
          {/* Breadcrumbs / Page context */}
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <span>EcoSphere</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-slate-200 capitalize">Platform</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <NotificationBell 
              initialNotifications={formattedNotifications} 
              userId={session.userId} 
            />

            {/* Profile badge (mobile only / small screens indicator) */}
            <div className="md:hidden flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 border border-slate-800">
              <UserIcon className="w-4.5 h-4.5 text-slate-400" />
            </div>
          </div>
        </header>

        {/* Content Page */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* 3. Mobile Bottom Nav Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-slate-800 bg-slate-950/95 backdrop-blur-xl flex items-center justify-around px-2 z-40">
        {allowedNavItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center w-12 h-12 rounded-lg text-slate-400 hover:text-white transition-all"
            >
              <Icon className={`w-5 h-5 ${item.color}`} />
              <span className="text-[9px] mt-0.5 font-medium">{item.name}</span>
            </Link>
          );
        })}
        {/* Mobile logout indicator */}
        <Link
          href="/settings"
          className="md:hidden flex flex-col items-center justify-center w-12 h-12 rounded-lg text-slate-400"
        >
          <Settings className="w-5 h-5 text-slate-400" />
          <span className="text-[9px] mt-0.5 font-medium">Settings</span>
        </Link>
      </nav>
    </div>
  );
}
