'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface BedsFilterProps {
  onFilterChange: (beds: number | null, baths: number | null) => void;
}

const bedBathOptions = [
  { label: 'Any Beds/Baths', beds: null, baths: null },
  { label: 'Studio', beds: 0, baths: null },
  { label: '1 Bed', beds: 1, baths: null },
  { label: '2 Beds', beds: 2, baths: null },
  { label: '3 Beds', beds: 3, baths: null },
  { label: '4+ Beds', beds: 4, baths: null },
  { label: '1+ Bath', beds: null, baths: 1 },
  { label: '2+ Baths', beds: null, baths: 2 },
];

export default function BedsFilter({ onFilterChange }: BedsFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState(bedBathOptions[0]);
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

  const handleOptionSelect = (option: typeof bedBathOptions[0]) => {
    setSelectedOption(option);
    setIsOpen(false);
    onFilterChange(option.beds, option.baths);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-full hover:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm"
        style={{ borderWidth: '0.7px' }}
      >
        <span className="text-foreground">{selectedOption.label}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-44 bg-zinc-900 border border-zinc-700 rounded-lg shadow-lg z-10">
          {bedBathOptions.map((option, index) => (
            <button
              key={index}
              onClick={() => handleOptionSelect(option)}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-zinc-800 transition-colors ${
                selectedOption.label === option.label ? 'bg-zinc-800 text-blue-400' : 'text-foreground'
              } ${index === 0 ? 'rounded-t-lg' : ''} ${index === bedBathOptions.length - 1 ? 'rounded-b-lg' : ''}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 