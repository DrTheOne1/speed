import React from 'react';

interface SenderNameDropdownProps {
  value: string;
  onChange: (value: string) => void;
  senderNames: {value: string, label: string}[];
  className?: string;
  placeholder?: string;
}

export function SenderNameDropdown({ 
  value,
  onChange,
  senderNames,
  className = "",
  placeholder = "Select sender name"
}: SenderNameDropdownProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full p-2 border rounded ${className}`}
    >
      <option value="">{placeholder}</option>
      {senderNames.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}