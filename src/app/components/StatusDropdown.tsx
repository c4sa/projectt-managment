import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { ProjectStatus } from '../data/store';

interface StatusDropdownProps {
  currentStatus: ProjectStatus;
  onStatusChange: (newStatus: ProjectStatus) => void;
}

export function StatusDropdown({ currentStatus, onStatusChange }: StatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 hover:bg-green-200';
      case 'planning': return 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200';
      case 'on_hold': return 'bg-red-100 text-red-700 hover:bg-red-200';
      case 'completed': return 'bg-blue-100 text-blue-700 hover:bg-blue-200';
    }
  };

  const statusOptions: { value: ProjectStatus; label: string; color: string; bgHover: string }[] = [
    { value: 'planning', label: 'Planning', color: 'bg-yellow-500', bgHover: 'hover:bg-yellow-50' },
    { value: 'active', label: 'Active', color: 'bg-green-500', bgHover: 'hover:bg-green-50' },
    { value: 'on_hold', label: 'On Hold', color: 'bg-red-500', bgHover: 'hover:bg-red-50' },
    { value: 'completed', label: 'Completed', color: 'bg-blue-500', bgHover: 'hover:bg-blue-50' },
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleStatusSelect = (status: ProjectStatus) => {
    onStatusChange(status);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`${getStatusColor(currentStatus)} px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 transition-opacity cursor-pointer`}
      >
        {currentStatus.replace('_', ' ')}
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[150px]">
          <div className="p-1">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleStatusSelect(option.value)}
                className={`w-full text-left px-3 py-2 rounded ${option.bgHover} flex items-center gap-2 text-sm transition-colors ${
                  currentStatus === option.value ? 'font-semibold' : ''
                }`}
              >
                <span className={`w-2 h-2 ${option.color} rounded-full`}></span>
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
