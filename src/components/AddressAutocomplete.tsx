"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  }) => void;
  placeholder?: string;
  className?: string;
}

interface Suggestion {
  display: string;
  street: string;
  city: string;
  state: string;
  zip: string;
}

// US state name → abbreviation map
const STATE_ABBR: Record<string, string> = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA",
  Colorado: "CO", Connecticut: "CT", Delaware: "DE", Florida: "FL", Georgia: "GA",
  Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA",
  Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD",
  Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS",
  Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV",
  "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
  "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK",
  Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT",
  Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI",
  Wyoming: "WY",
};

function parseNominatimResult(result: {
  display_name: string;
  address: Record<string, string>;
}): Suggestion {
  const addr = result.address;

  const houseNumber = addr.house_number || "";
  const road = addr.road || "";
  const street = [houseNumber, road].filter(Boolean).join(" ");

  const city =
    addr.city || addr.town || addr.village || addr.hamlet || addr.county || "";

  const stateFull = addr.state || "";
  const state = STATE_ABBR[stateFull] || stateFull;

  const zip = addr.postcode || "";

  return {
    display: street
      ? `${street}, ${city}, ${state} ${zip}`.trim()
      : result.display_name,
    street,
    city,
    state,
    zip,
  };
}

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Start typing an address...",
  className = "",
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
          new URLSearchParams({
            q: query,
            format: "json",
            addressdetails: "1",
            countrycodes: "us",
            limit: "8",
            dedupe: "1",
          }),
        {
          headers: {
            "Accept-Language": "en-US",
          },
        }
      );

      if (!res.ok) return;

      const data = await res.json();
      const parsed: Suggestion[] = data
        .map(parseNominatimResult)
        .filter((s: Suggestion) => s.street && s.city);

      // Deduplicate by street + city + state
      const seen = new Set<string>();
      const unique = parsed.filter((s) => {
        const key = `${s.street}|${s.city}|${s.state}`.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setSuggestions(unique.slice(0, 6));
      setShowDropdown(unique.length > 0);
      setActiveIndex(-1);
    } catch {
      // Silently fail - user can still type manually
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 250);
  };

  const handleSelect = (suggestion: Suggestion) => {
    onChange(suggestion.street);
    onSelect({
      street: suggestion.street,
      city: suggestion.city,
      state: suggestion.state,
      zip: suggestion.zip,
    });
    setShowDropdown(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />

      {showDropdown && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {suggestions.map((suggestion, i) => (
            <li
              key={i}
              onClick={() => handleSelect(suggestion)}
              onMouseEnter={() => setActiveIndex(i)}
              className={`cursor-pointer px-4 py-2.5 text-sm transition-colors ${
                i === activeIndex
                  ? "bg-brand-50 text-brand-800"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {suggestion.display}
            </li>
          ))}
          <li className="border-t border-gray-100 px-4 py-1.5 text-[10px] text-gray-400">
            Powered by OpenStreetMap
          </li>
        </ul>
      )}
    </div>
  );
}
