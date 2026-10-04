"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import { Search, Check, Loader2, Plus } from "lucide-react";
import { useDebounced } from "@/hooks/useDebounced";

export type DropdownOption = {
  id: string | number;
  label: string;
  sublabel?: string;
  metadata?: Record<string, any>;
};

type DropdownWithSearchProps<T extends DropdownOption> = {
  options: T[];
  selectedId: string | number | null;
  onSelect: (option: T | null) => void;
  isLoading?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  renderOption?: (option: T, isSelected: boolean) => ReactNode;
  getOptionLabel?: (option: T) => string;
  getOptionSublabel?: (option: T) => string | null;
  className?: string;
  disabled?: boolean;
  onSearch?: (searchTerm: string) => void;
  debounceDelay?: number;
  autoFocus?: boolean;
  showAddNew?: boolean;
  addNewLabel?: string;
  onAddNew?: () => void;
  addNewIcon?: ReactNode;
};

export function DropdownWithSearch<T extends DropdownOption>({
  options,
  selectedId,
  onSelect,
  isLoading = false,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  emptyMessage = "No options found",
  renderOption,
  getOptionLabel,
  getOptionSublabel,
  className = "",
  disabled = false,
  onSearch,
  debounceDelay = 300,
  autoFocus = true,
  showAddNew = false,
  addNewLabel = "+ Create new",
  onAddNew,
  addNewIcon,
}: DropdownWithSearchProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounced(searchTerm, debounceDelay);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const lastTriggeredSearchRef = useRef<string>("");

  const selectedOption = options.find((opt) => opt.id === selectedId);

  useEffect(() => {
    if (onSearch && debouncedSearchTerm !== lastTriggeredSearchRef.current) {
      lastTriggeredSearchRef.current = debouncedSearchTerm;
      onSearch(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, onSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm("");
        // Reset the last triggered search ref when closing
        lastTriggeredSearchRef.current = "";
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search when dropdown opens
  useEffect(() => {
    if (isOpen && autoFocus && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      const element = document.getElementById("dropdown");
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [isOpen, autoFocus]);

  const handleSelect = (option: T) => {
    const isSameOption = selectedId === option.id;

    if (isSameOption) {
      onSelect(null);
    } else {
      onSelect(option);
    }

    setIsOpen(false);
    setSearchTerm("");
    lastTriggeredSearchRef.current = "";
  };

  const handleAddNew = () => {
    if (onAddNew) {
      onAddNew();
      setIsOpen(false);
      setSearchTerm("");
    }
  };

  // Default render function
  const defaultRenderOption = (option: T, isSelected: boolean) => {
    const label = getOptionLabel ? getOptionLabel(option) : option.label;
    const sublabel = getOptionSublabel
      ? getOptionSublabel(option)
      : option.sublabel;

    return (
      <div className="flex items-center justify-between w-full">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-900">{label}</span>
            {isSelected && <Check className="h-4 w-4 text-green-600" />}
          </div>
          {sublabel && (
            <div className="text-xs text-slate-500 mt-1">{sublabel}</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Selected Option Display / Trigger */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`relative w-full rounded-xl border border-slate-200 bg-white transition ${
          !disabled
            ? "cursor-pointer hover:border-slate-400"
            : "cursor-not-allowed bg-slate-50"
        }`}
      >
        <div className="flex min-h-[45px] items-center justify-between px-4 py-2">
          {selectedOption ? (
            <div className="flex-1">
              <div className=" text-slate-700 text-sm">
                {getOptionLabel
                  ? getOptionLabel(selectedOption)
                  : selectedOption.label}
              </div>
              {getOptionSublabel && getOptionSublabel(selectedOption) && (
                <div className="text-xs text-slate-500 mt-0.5">
                  {getOptionSublabel(selectedOption)}
                </div>
              )}
            </div>
          ) : (
            <span className="text-sm text-slate-400">{placeholder}</span>
          )}
          <svg
            className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
          id="dropdown"
        >
          {/* Search Input */}
          <div className="border-b border-slate-100 p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : options.length === 0 && !showAddNew ? (
              <div className="py-8 text-center text-sm text-slate-500">
                {emptyMessage}
              </div>
            ) : (
              <>
                {/* Existing Options */}
                {options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={`w-full cursor-pointer px-4 py-3 text-left transition hover:bg-slate-50 ${
                      selectedId === option.id ? "bg-slate-50" : ""
                    }`}
                  >
                    {renderOption
                      ? renderOption(option, selectedId === option.id)
                      : defaultRenderOption(option, selectedId === option.id)}
                  </button>
                ))}

                {/* Add New Option */}
                {showAddNew && onAddNew && (
                  <>
                    <button
                      type="button"
                      onClick={handleAddNew}
                      className="w-full px-4 cursor-pointer py-3 text-left transition hover:bg-slate-50 border-t border-slate-100 mt-1 hover:border-t-transparent"
                    >
                      <div className="flex items-center gap-2 text-slate-700">
                        {addNewIcon || (
                          <Plus className="h-4 w-4 text-slate-500" />
                        )}
                        <span className="text-sm font-medium">
                          {addNewLabel}
                        </span>
                      </div>
                    </button>
                  </>
                )}

                {/* Empty state when no options but add new is enabled */}
                {options.length === 0 && showAddNew && onAddNew && (
                  <button
                    type="button"
                    onClick={handleAddNew}
                    className="w-full px-4 cursor-pointer py-3 text-left transition hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-2 text-slate-700">
                      {addNewIcon || (
                        <Plus className="h-4 w-4 text-slate-500" />
                      )}
                      <span className="text-sm font-medium">{addNewLabel}</span>
                    </div>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
