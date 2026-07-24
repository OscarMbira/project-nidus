/**
 * Tag Input Component
 * Tag management for daily log entries
 */

import { useState } from 'react';
import { X, Plus } from 'lucide-react';

export default function TagInput({ tags = [], onChange, placeholder = 'Add tags...' }) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue.trim());
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      // Remove last tag on backspace when input is empty
      removeTag(tags.length - 1);
    }
  };

  const addTag = (tag) => {
    const normalizedTag = tag.toLowerCase().trim();
    if (normalizedTag && !tags.includes(normalizedTag)) {
      onChange([...tags, normalizedTag]);
      setInputValue('');
    }
  };

  const removeTag = (index) => {
    const newTags = tags.filter((_, i) => i !== index);
    onChange(newTags);
  };

  const handleInputBlur = () => {
    if (inputValue.trim()) {
      addTag(inputValue.trim());
    }
  };

  return (
    <div className="flex flex-wrap gap-2 items-center p-2 border border-gray-300 rounded-md min-h-[42px] focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
      {tags.map((tag, index) => (
        <span
          key={index}
          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(index)}
            className="hover:text-blue-900"
            title="Remove tag"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleInputBlur}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] outline-none bg-transparent"
      />
    </div>
  );
}
