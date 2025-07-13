'use client';

import { User } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-background border-b border-border px-6 py-4">
      <div className="mx-[3%] flex items-center justify-between relative">
        {/* Logo */}
        <div className="flex items-center">
          <h1 className="text-2xl font-semibold text-white">roomer</h1>
        </div>

        {/* Navigation - Centered */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <nav className="flex items-center gap-1">
            <button className="px-6 py-2 rounded-full border border-border text-muted-foreground hover:bg-muted transition-colors font-medium text-sm">
              Roomies
            </button>
            <button className="px-6 py-2 rounded-full bg-white text-black hover:bg-gray-100 transition-colors font-medium text-sm">
              Places
            </button>
          </nav>
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-3">
          <span className="text-foreground font-medium text-sm">John Humphrey</span>
          <button className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-accent transition-colors">
            <User className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </div>
    </header>
  );
} 