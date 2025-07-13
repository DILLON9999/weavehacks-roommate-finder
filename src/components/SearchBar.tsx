'use client';

import { Search } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative flex-1">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search"
        className="w-full px-4 py-2.5 pr-10 bg-zinc-900 border border-zinc-700 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-zinc-600 transition-all duration-200 text-foreground placeholder-muted-foreground text-sm"
        style={{ borderWidth: '0.7px' }}
      />
      <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
        <Search className="w-4 h-4" />
      </button>
    </div>
  );
} 