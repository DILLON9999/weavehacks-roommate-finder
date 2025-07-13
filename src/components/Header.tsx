'use client';

import { User } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200 px-8 py-6">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-12">
          <h1 className="text-3xl font-bold text-blue-600">roomers</h1>
          
          {/* Navigation */}
          <nav className="flex items-center gap-2">
            <button className="px-8 py-3 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-medium">
              Roomies
            </button>
            <button className="px-8 py-3 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium">
              Places
            </button>
          </nav>
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-4">
          <span className="text-gray-700 font-medium">Noel Testing</span>
          <button className="w-12 h-12 rounded-full bg-gray-900 flex items-center justify-center hover:bg-gray-800 transition-colors">
            <User className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>
    </header>
  );
} 