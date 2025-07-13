'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface PriceFilterProps {
  onPriceChange: (minPrice: number | null, maxPrice: number | null) => void;
}

const priceRanges = [
  { label: 'Any Price', min: null, max: null },
  { label: '$500 - $1,000', min: 500, max: 1000 },
  { label: '$1,000 - $1,500', min: 1000, max: 1500 },
  { label: '$1,500 - $2,000', min: 1500, max: 2000 },
  { label: '$2,000 - $2,500', min: 2000, max: 2500 },
  { label: '$2,500 - $3,000', min: 2500, max: 3000 },
  { label: '$3,000+', min: 3000, max: null },
];

export default function PriceFilter({ onPriceChange }: PriceFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState(priceRanges[0]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRangeSelect = (range: typeof priceRanges[0]) => {
    setSelectedRange(range);
    setIsOpen(false);
    onPriceChange(range.min, range.max);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-full hover:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm"
        style={{ borderWidth: '0.7px' }}
      >
        <span className="text-foreground">{selectedRange.label}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-zinc-900 border border-zinc-700 rounded-lg shadow-lg z-10">
          {priceRanges.map((range, index) => (
            <button
              key={index}
              onClick={() => handleRangeSelect(range)}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-zinc-800 transition-colors ${
                selectedRange.label === range.label ? 'bg-zinc-800 text-blue-400' : 'text-foreground'
              } ${index === 0 ? 'rounded-t-lg' : ''} ${index === priceRanges.length - 1 ? 'rounded-b-lg' : ''}`}
            >
              {range.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 