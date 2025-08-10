// src/components/DateTimeRangePicker.tsx
import React, { useState, useCallback } from 'react';

export interface DateTimeRange {
  startDate: string; // ISO date string YYYY-MM-DD
  startTime: string; // Time string HH:MM
  endDate: string; // ISO date string YYYY-MM-DD
  endTime: string; // Time string HH:MM
}

interface DateTimeRangePickerProps {
  value: DateTimeRange;
  onChange: (range: DateTimeRange) => void;
  className?: string;
  maxDaysBack?: number; // Maximum days back from today (default: 30)
}

const DateTimeRangePicker: React.FC<DateTimeRangePickerProps> = ({
  value,
  onChange,
  className = '',
  maxDaysBack = 30,
}) => {
  const [showPresets, setShowPresets] = useState(false);

  // Get current date and time for validation
  const now = new Date();
  const currentDate = now.toISOString().split('T')[0];
  const currentTime = now.toTimeString().slice(0, 5);

  // Calculate minimum allowed date
  const minDate = new Date(now.getTime() - maxDaysBack * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  // Preset options
  const presets = [
    {
      label: 'Last Hour',
      getValue: () => {
        const end = new Date();
        const start = new Date(end.getTime() - 60 * 60 * 1000);
        return {
          startDate: start.toISOString().split('T')[0],
          startTime: start.toTimeString().slice(0, 5),
          endDate: end.toISOString().split('T')[0],
          endTime: end.toTimeString().slice(0, 5),
        };
      },
    },
    {
      label: 'Last 4 Hours',
      getValue: () => {
        const end = new Date();
        const start = new Date(end.getTime() - 4 * 60 * 60 * 1000);
        return {
          startDate: start.toISOString().split('T')[0],
          startTime: start.toTimeString().slice(0, 5),
          endDate: end.toISOString().split('T')[0],
          endTime: end.toTimeString().slice(0, 5),
        };
      },
    },
    {
      label: 'Today',
      getValue: () => ({
        startDate: currentDate,
        startTime: '00:00',
        endDate: currentDate,
        endTime: currentTime,
      }),
    },
    {
      label: 'Yesterday',
      getValue: () => {
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        return {
          startDate: yesterdayStr,
          startTime: '00:00',
          endDate: yesterdayStr,
          endTime: '23:59',
        };
      },
    },
    {
      label: 'Last 7 Days',
      getValue: () => {
        const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return {
          startDate: start.toISOString().split('T')[0],
          startTime: '00:00',
          endDate: currentDate,
          endTime: currentTime,
        };
      },
    },
  ];

  // Validation function
  const validateRange = useCallback(
    (range: DateTimeRange): string | null => {
      const startDateTime = new Date(`${range.startDate}T${range.startTime}`);
      const endDateTime = new Date(`${range.endDate}T${range.endTime}`);
      const nowDateTime = new Date();

      // Check if dates are in the future
      if (startDateTime > nowDateTime || endDateTime > nowDateTime) {
        return 'Dates cannot be in the future';
      }

      // Check if start is after end
      if (startDateTime >= endDateTime) {
        return 'Start time must be before end time';
      }

      // Check if dates are within allowed range
      const minDateTime = new Date(minDate);
      if (startDateTime < minDateTime || endDateTime < minDateTime) {
        return `Dates cannot be more than ${maxDaysBack} days ago`;
      }

      // Check reasonable duration (max 7 days)
      const maxDuration = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
      if (endDateTime.getTime() - startDateTime.getTime() > maxDuration) {
        return 'Date range cannot exceed 7 days';
      }

      return null;
    },
    [maxDaysBack, minDate]
  );

  // Handle input changes
  const handleChange = useCallback(
    (field: keyof DateTimeRange, newValue: string) => {
      const newRange = { ...value, [field]: newValue };
      onChange(newRange);
    },
    [value, onChange]
  );

  // Handle preset selection
  const handlePresetSelect = useCallback(
    (preset: (typeof presets)[0]) => {
      const newRange = preset.getValue();
      onChange(newRange);
      setShowPresets(false);
    },
    [onChange]
  );

  // Get validation error
  const validationError = validateRange(value);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Preset Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setShowPresets(!showPresets)}
          className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-500 rounded-md text-white transition-colors"
        >
          Quick Select ▼
        </button>

        {showPresets && (
          <div className="absolute z-10 mt-8 bg-gray-800 border border-gray-600 rounded-md shadow-lg">
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handlePresetSelect(preset)}
                className="block w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 first:rounded-t-md last:rounded-b-md"
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Date and Time Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Start Date/Time */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">Start Date & Time</label>
          <div className="flex space-x-2">
            <input
              type="date"
              value={value.startDate}
              onChange={(e) => handleChange('startDate', e.target.value)}
              min={minDate}
              max={currentDate}
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <input
              type="time"
              value={value.startTime}
              onChange={(e) => handleChange('startTime', e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* End Date/Time */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">End Date & Time</label>
          <div className="flex space-x-2">
            <input
              type="date"
              value={value.endDate}
              onChange={(e) => handleChange('endDate', e.target.value)}
              min={minDate}
              max={currentDate}
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <input
              type="time"
              value={value.endTime}
              onChange={(e) => handleChange('endTime', e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Validation Error */}
      {validationError && (
        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-md">
          <p className="text-sm text-red-400">{validationError}</p>
        </div>
      )}

      {/* Duration Display */}
      {!validationError && (
        <div className="text-sm text-gray-400">
          Duration:{' '}
          {(() => {
            const startDateTime = new Date(`${value.startDate}T${value.startTime}`);
            const endDateTime = new Date(`${value.endDate}T${value.endTime}`);
            const durationMs = endDateTime.getTime() - startDateTime.getTime();
            const hours = Math.floor(durationMs / (1000 * 60 * 60));
            const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

            if (hours > 24) {
              const days = Math.floor(hours / 24);
              const remainingHours = hours % 24;
              return `${days}d ${remainingHours}h ${minutes}m`;
            }
            return `${hours}h ${minutes}m`;
          })()}
        </div>
      )}
    </div>
  );
};

export default DateTimeRangePicker;
