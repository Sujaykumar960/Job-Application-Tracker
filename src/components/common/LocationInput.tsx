import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapPin,
  LocateFixed,
  Loader2,
  Check,
  Search,
  Globe,
  Building,
  X,
  Compass,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export interface LocationInputProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  id?: string;
  className?: string;
  required?: boolean;
}

// Curated popular tech hubs and remote variations
const POPULAR_LOCATIONS = [
  { name: 'Remote', type: 'remote', subtitle: 'Work from anywhere' },
  { name: 'Remote (Worldwide)', type: 'remote', subtitle: 'Global remote team' },
  { name: 'Remote (US)', type: 'remote', subtitle: 'United States remote only' },
  { name: 'Remote (India)', type: 'remote', subtitle: 'India remote only' },
  { name: 'San Francisco, CA', type: 'city', subtitle: 'California, United States' },
  { name: 'San Francisco, CA (Hybrid)', type: 'hybrid', subtitle: 'California, United States' },
  { name: 'New York, NY', type: 'city', subtitle: 'New York, United States' },
  { name: 'New York, NY (Hybrid)', type: 'hybrid', subtitle: 'New York, United States' },
  { name: 'Seattle, WA', type: 'city', subtitle: 'Washington, United States' },
  { name: 'Austin, TX', type: 'city', subtitle: 'Texas, United States' },
  { name: 'Bengaluru, Karnataka, India', type: 'city', subtitle: 'Silicon Valley of India' },
  { name: 'Hyderabad, Telangana, India', type: 'city', subtitle: 'Telangana, India' },
  { name: 'Pune, Maharashtra, India', type: 'city', subtitle: 'Maharashtra, India' },
  { name: 'Delhi NCR, India', type: 'city', subtitle: 'Gurugram / Noida, India' },
  { name: 'London, United Kingdom', type: 'city', subtitle: 'England, United Kingdom' },
  { name: 'Berlin, Germany', type: 'city', subtitle: 'Berlin, Germany' },
  { name: 'Amsterdam, Netherlands', type: 'city', subtitle: 'North Holland, Netherlands' },
  { name: 'Toronto, ON, Canada', type: 'city', subtitle: 'Ontario, Canada' },
  { name: 'Singapore', type: 'city', subtitle: 'Singapore' },
  { name: 'Tokyo, Japan', type: 'city', subtitle: 'Kanto, Japan' },
  { name: 'Sydney, Australia', type: 'city', subtitle: 'New South Wales, Australia' },
];

export const LocationInput: React.FC<LocationInputProps> = ({
  label = 'Location *',
  placeholder = 'e.g. San Francisco, CA (Hybrid) or Remote',
  value = '',
  onChange,
  error,
  id,
  className,
  required = false,
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [liveResults, setLiveResults] = useState<Array<{ name: string; subtitle: string }>>([]);
  const [isSearchingLive, setIsSearchingLive] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with incoming value prop
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Handle outside click to dismiss dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch live global city suggestions via OpenStreetMap Nominatim
  const fetchLiveSuggestions = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setLiveResults([]);
      setIsSearchingLive(false);
      return;
    }

    try {
      setIsSearchingLive(true);
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        query.trim()
      )}&format=json&addressdetails=1&limit=5`;
      const response = await fetch(url, {
        headers: { 'Accept-Language': 'en' },
      });
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();

      const mapped = data.map((item: any) => {
        const address = item.address || {};
        const city =
          address.city ||
          address.town ||
          address.village ||
          address.municipality ||
          item.name;
        const state = address.state || address.region || '';
        const country = address.country || '';

        const parts = [city, state, country].filter(Boolean);
        const uniqueParts = Array.from(new Set(parts));
        const formattedName = uniqueParts.join(', ');

        return {
          name: formattedName,
          subtitle: item.display_name,
        };
      });

      setLiveResults(mapped);
    } catch {
      setLiveResults([]);
    } finally {
      setIsSearchingLive(false);
    }
  }, []);

  // Handle input text changes with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    onChange?.(val);
    setIsOpen(true);
    setGeoError(null);
    setActiveIndex(-1);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      fetchLiveSuggestions(val);
    }, 350);
  };

  // Select an item from suggestions
  const handleSelectLocation = (locName: string) => {
    setInputValue(locName);
    onChange?.(locName);
    setIsOpen(false);
    setGeoError(null);
  };

  // One-click work arrangement toggles (Remote, Hybrid, On-site)
  const handleApplyModality = (modality: 'Remote' | 'Hybrid' | 'On-site') => {
    let newValue = inputValue.trim();

    if (!newValue || newValue.toLowerCase() === 'remote' || newValue.toLowerCase() === 'hybrid' || newValue.toLowerCase() === 'on-site') {
      newValue = modality;
    } else {
      // Remove existing parenthetical modality if present
      const cleaned = newValue.replace(/\s*\((Remote|Hybrid|On-site)\)/gi, '').trim();
      newValue = modality === 'On-site' ? cleaned : `${cleaned} (${modality})`;
    }

    setInputValue(newValue);
    onChange?.(newValue);
    setIsOpen(false);
  };

  // Browser Geolocation Detection
  const handleDetectCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setIsDetecting(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;
          const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
          const data = await res.json();

          const address = data.address || {};
          const city =
            address.city ||
            address.town ||
            address.village ||
            address.municipality ||
            address.county ||
            'Detected Location';
          const state = address.state || '';
          const country = address.country || '';

          const parts = [city, state, country].filter(Boolean);
          const locationString = parts.join(', ');

          handleSelectLocation(locationString);
        } catch {
          setGeoError('Could not convert coordinates to city name.');
        } finally {
          setIsDetecting(false);
        }
      },
      (err) => {
        setIsDetecting(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError('Location permission was denied in your browser settings.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGeoError('Location information is currently unavailable.');
        } else {
          setGeoError('Location request timed out. Please pick from the list.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Filter curated list based on typed query
  const query = inputValue.trim().toLowerCase();
  const filteredPopular = query
    ? POPULAR_LOCATIONS.filter(
        (loc) =>
          loc.name.toLowerCase().includes(query) ||
          loc.subtitle.toLowerCase().includes(query)
      )
    : POPULAR_LOCATIONS.slice(0, 10);

  // Combine items for keyboard navigation
  const allNavigableItems = [
    ...liveResults.map((r) => r.name),
    ...filteredPopular.map((r) => r.name),
  ];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev < allNavigableItems.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : allNavigableItems.length - 1));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < allNavigableItems.length) {
        e.preventDefault();
        handleSelectLocation(allNavigableItems[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const inputId = id || (label ? label.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'location-input');

  return (
    <div ref={containerRef} className={cn('relative w-full space-y-1.5', className)}>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-[#1D2226] dark:text-[#E2E8F0]">
          {label}
        </label>
      )}

      {/* Input container */}
      <div className="relative rounded-lg">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#788896] dark:text-[#94A3B8]">
          <MapPin className="w-3.5 h-3.5" />
        </div>

        <input
          id={inputId}
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          className={cn(
            'w-full bg-white dark:bg-[#1E293B] text-[#1D2226] dark:text-[#F8FAFC] placeholder-[#788896] dark:placeholder-[#64748B] text-xs sm:text-sm rounded-lg border py-2 pl-9 pr-9 transition duration-150',
            'focus:outline-none focus:ring-2 focus:ring-[#E8F3FF] dark:focus:ring-[#38BDF8]/20 focus:border-[#0A66C2] dark:focus:border-[#38BDF8]',
            error
              ? 'border-[#E6395A] dark:border-rose-500'
              : 'border-[#D9D9D9] dark:border-[#475569] hover:border-[#788896] dark:hover:border-[#94A3B8]',
            isOpen && 'ring-2 ring-[#E8F3FF] dark:ring-[#38BDF8]/20 border-[#0A66C2] dark:border-[#38BDF8]'
          )}
        />

        {/* Clear or loading indicator */}
        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center">
          {isDetecting || isSearchingLive ? (
            <Loader2 className="w-3.5 h-3.5 text-[#0A66C2] animate-spin" />
          ) : inputValue ? (
            <button
              type="button"
              onClick={() => {
                setInputValue('');
                onChange?.('');
                inputRef.current?.focus();
              }}
              className="p-1 text-[#788896] dark:text-[#94A3B8] hover:text-[#1D2226] dark:hover:text-[#F8FAFC] rounded-md transition"
              title="Clear location"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {error && <p className="text-[11px] text-[#E6395A] dark:text-rose-400 font-medium">{error}</p>}

      {/* Location Dropdown Popover */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 left-0 right-0 mt-1 max-h-80 overflow-y-auto bg-white dark:bg-[#0F172A] rounded-xl border border-[#D9D9D9] dark:border-[#334155] shadow-2xl p-2.5 space-y-2 animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Action 1: Geolocation Detection Button */}
          <button
            type="button"
            onClick={handleDetectCurrentLocation}
            disabled={isDetecting}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-[#0A66C2] bg-[#E8F3FF]/70 hover:bg-[#E8F3FF] rounded-lg border border-[#cbe3fb] transition group"
          >
            <div className="flex items-center gap-2">
              {isDetecting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0A66C2]" />
              ) : (
                <LocateFixed className="w-3.5 h-3.5 text-[#0A66C2] group-hover:scale-110 transition-transform" />
              )}
              <span>{isDetecting ? 'Detecting current city...' : 'Use My Current Location'}</span>
            </div>
            <span className="text-[10px] uppercase font-bold text-[#0A66C2]/70 tracking-wider">
              GPS
            </span>
          </button>

          {geoError && (
            <div className="p-2 text-[11px] text-[#B3261E] bg-[#FCE8E6] rounded-lg border border-[#f8cbc7]">
              {geoError}
            </div>
          )}

          {/* Action 2: Quick Modality Chips */}
          <div className="pt-1">
            <div className="text-[10px] font-semibold text-[#788896] uppercase tracking-wider px-1 mb-1.5 flex items-center gap-1">
              <Compass className="w-3 h-3" />
              <span>Work Arrangement</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => handleApplyModality('Remote')}
                className="px-2.5 py-1 text-xs font-medium bg-[#F3F6F8] hover:bg-[#E8F3FF] hover:text-[#0A66C2] text-[#1D2226] rounded-full border border-[#E2E8F0] transition flex items-center gap-1"
              >
                <Globe className="w-3 h-3 text-[#0A66C2]" />
                Remote
              </button>
              <button
                type="button"
                onClick={() => handleApplyModality('Hybrid')}
                className="px-2.5 py-1 text-xs font-medium bg-[#F3F6F8] hover:bg-[#E8F3FF] hover:text-[#0A66C2] text-[#1D2226] rounded-full border border-[#E2E8F0] transition flex items-center gap-1"
              >
                <Building className="w-3 h-3 text-[#4B70E2]" />
                Hybrid
              </button>
              <button
                type="button"
                onClick={() => handleApplyModality('On-site')}
                className="px-2.5 py-1 text-xs font-medium bg-[#F3F6F8] hover:bg-[#E8F3FF] hover:text-[#0A66C2] text-[#1D2226] rounded-full border border-[#E2E8F0] transition flex items-center gap-1"
              >
                <MapPin className="w-3 h-3 text-[#1D2226]" />
                On-site
              </button>
            </div>
          </div>

          <div className="h-px bg-[#E2E8F0] my-1" />

          {/* Live Search Results if user is typing */}
          {liveResults.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-[#788896] uppercase tracking-wider px-1 mb-1 flex items-center gap-1">
                <Search className="w-3 h-3 text-[#0A66C2]" />
                <span>Search Suggestions</span>
              </div>
              <div className="space-y-0.5">
                {liveResults.map((item, idx) => {
                  const isSelected = inputValue.toLowerCase() === item.name.toLowerCase();
                  const isHighlighted = activeIndex === idx;
                  return (
                    <button
                      key={`live-${idx}`}
                      type="button"
                      onClick={() => handleSelectLocation(item.name)}
                      className={cn(
                        'w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition',
                        isSelected || isHighlighted
                          ? 'bg-[#E8F3FF] text-[#0A66C2] font-semibold'
                          : 'text-[#1D2226] hover:bg-[#F3F6F8]'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-[#0A66C2] flex-shrink-0" />
                        <div className="truncate">
                          <p className="truncate font-medium">{item.name}</p>
                          <p className="text-[10px] text-[#788896] truncate">{item.subtitle}</p>
                        </div>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#0A66C2] flex-shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Curated Popular Tech Hubs */}
          <div>
            <div className="text-[10px] font-semibold text-[#788896] uppercase tracking-wider px-1 mb-1">
              {query ? 'Matching Locations' : 'Popular Tech Hubs'}
            </div>
            {filteredPopular.length === 0 && liveResults.length === 0 ? (
              <div className="text-center py-3 text-xs text-[#788896]">
                No predefined locations found. Press enter to use &ldquo;{inputValue}&rdquo;.
              </div>
            ) : (
              <div className="space-y-0.5">
                {filteredPopular.map((loc, idx) => {
                  const navIdx = liveResults.length + idx;
                  const isSelected = inputValue.toLowerCase() === loc.name.toLowerCase();
                  const isHighlighted = activeIndex === navIdx;

                  return (
                    <button
                      key={loc.name}
                      type="button"
                      onClick={() => handleSelectLocation(loc.name)}
                      className={cn(
                        'w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition',
                        isSelected || isHighlighted
                          ? 'bg-[#E8F3FF] text-[#0A66C2] font-semibold'
                          : 'text-[#1D2226] hover:bg-[#F3F6F8]'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {loc.type === 'remote' ? (
                          <Globe className="w-3.5 h-3.5 text-[#0A66C2] flex-shrink-0" />
                        ) : loc.type === 'hybrid' ? (
                          <Building className="w-3.5 h-3.5 text-[#4B70E2] flex-shrink-0" />
                        ) : (
                          <MapPin className="w-3.5 h-3.5 text-[#788896] flex-shrink-0" />
                        )}
                        <div className="truncate">
                          <p className="truncate font-medium">{loc.name}</p>
                          <p className="text-[10px] text-[#788896] truncate">{loc.subtitle}</p>
                        </div>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#0A66C2] flex-shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationInput;
