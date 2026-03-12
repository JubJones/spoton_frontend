import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  BackendCameraId,
  EnvironmentId,
  ReIdentificationFeedbackDecision,
  ReIdentificationFeedbackItem,
} from '../types/api';
import { apiService } from '../services/apiService';
import { useCameraConfig } from '../context/CameraConfigContext';

interface ReidFeedbackPanelProps {
  globalPersonId?: string;
  sessionId?: string | null;
  cameraId?: string | null;
  environmentId?: EnvironmentId;
  refreshToken?: number;
  className?: string;
  requireSelection?: boolean;
}

const DECISION_OPTIONS: Array<{ label: string; value: '' | ReIdentificationFeedbackDecision }> = [
  { value: '', label: 'All decisions' },
  { value: 'thumbs_up', label: 'Thumbs up' },
  { value: 'thumbs_down', label: 'Thumbs down' },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const formatTimestamp = (value: string) => {
  return new Date(value).toLocaleString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    month: 'short',
    day: '2-digit',
  });
};

const toStartOfDayIso = (value: string) => `${value}T00:00:00.000Z`;
const toEndOfDayIso = (value: string) => `${value}T23:59:59.999Z`;

const ReidFeedbackPanel: React.FC<ReidFeedbackPanelProps> = ({
  globalPersonId,
  sessionId,
  cameraId,
  environmentId,
  refreshToken = 0,
  className = '',
  requireSelection = true,
}) => {
  const [decisionFilter, setDecisionFilter] = useState<'' | ReIdentificationFeedbackDecision>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<ReIdentificationFeedbackItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localRefreshTick, setLocalRefreshTick] = useState(0);
  const { getDisplayName } = useCameraConfig();

  const hasSelectionContext = Boolean(globalPersonId || (cameraId && sessionId));
  const shouldRequireSelection = requireSelection !== false;
  const canLoadData = shouldRequireSelection ? hasSelectionContext : true;

  const cameraDisplayName = useCallback(
    (id: string) => getDisplayName(id as BackendCameraId) || id,
    [getDisplayName]
  );

  const totalPages = useMemo(() => {
    if (total === 0) {
      return 1;
    }
    return Math.max(1, Math.ceil(total / limit));
  }, [limit, total]);

  const currentPage = useMemo(() => {
    if (limit === 0) {
      return 1;
    }
    return Math.floor(offset / limit) + 1;
  }, [limit, offset]);

  const resultRangeLabel = useMemo(() => {
    if (total === 0 || items.length === 0) {
      return '0 of 0';
    }
    const start = offset + 1;
    const end = offset + items.length;
    return `${start} – ${end} of ${total}`;
  }, [items.length, offset, total]);

  // Reset pagination when context changes
  useEffect(() => {
    setOffset((prev) => (prev === 0 ? prev : 0));
  }, [
    globalPersonId,
    sessionId,
    cameraId,
    environmentId,
    decisionFilter,
    startDate,
    endDate,
    limit,
    shouldRequireSelection,
  ]);

  useEffect(() => {
    if (!canLoadData) {
      setItems([]);
      setTotal(0);
      setError(null);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiService.getReIdentificationFeedback({
          global_person_id: globalPersonId || undefined,
          session_id: sessionId || undefined,
          camera_id: cameraId || undefined,
          environment_id: environmentId,
          decision: decisionFilter || undefined,
          start_time: startDate ? toStartOfDayIso(startDate) : undefined,
          end_time: endDate ? toEndOfDayIso(endDate) : undefined,
          limit,
          offset,
        });

        if (!isMounted) {
          return;
        }

        setItems(response.items);
        setTotal(response.total);
      } catch (err) {
        if (!isMounted) {
          return;
        }
        const message = err instanceof Error ? err.message : 'Failed to load feedback';
        setError(message);
        setItems([]);
        setTotal(0);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [
    canLoadData,
    cameraId,
    decisionFilter,
    endDate,
    environmentId,
    globalPersonId,
    limit,
    offset,
    refreshToken,
    sessionId,
    startDate,
    localRefreshTick,
    shouldRequireSelection,
  ]);

  const handleDecisionChange = (value: '' | ReIdentificationFeedbackDecision) => {
    setDecisionFilter(value);
  };

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    if (endDate && value && value > endDate) {
      setEndDate(value);
    }
  };

  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    if (startDate && value && value < startDate) {
      setStartDate(value);
    }
  };

  const handleLimitChange = (value: number) => {
    const normalized = Math.min(500, Math.max(1, value));
    setLimit(normalized);
  };

  const handleRefreshClick = () => {
    setLocalRefreshTick((prev) => prev + 1);
  };

  const clearFilters = () => {
    setDecisionFilter('');
    setStartDate('');
    setEndDate('');
    setLimit(10);
    setOffset(0);
  };

  const goToPrevPage = () => {
    setOffset((prev) => Math.max(0, prev - limit));
  };

  const goToNextPage = () => {
    setOffset((prev) => prev + limit);
  };

  const formatMetadataValue = (value: unknown): string => {
    if (value === null || value === undefined) {
      return '—';
    }
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch (error) {
        console.warn('Failed to stringify feedback metadata', error);
        return '[object]';
      }
    }
    return String(value);
  };

  return (
    <div className={`bg-gray-900/50 border border-gray-700 rounded-xl p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-200">Re-ID Feedback</h3>
          {shouldRequireSelection && !hasSelectionContext ? (
            <p className="text-xs text-gray-500">Select a person to review feedback history</p>
          ) : (
            <p className="text-xs text-gray-500">{total} submission{total === 1 ? '' : 's'} found</p>
          )}
        </div>
        <div className="text-xs text-gray-400 text-right">
          <div>{resultRangeLabel}</div>
          <button
            type="button"
            className="text-blue-400 hover:text-blue-300"
            onClick={handleRefreshClick}
            disabled={!canLoadData}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <select
          value={decisionFilter}
          onChange={(event) => handleDecisionChange(event.target.value as any)}
          className="bg-gray-800 text-gray-200 rounded px-2 py-1 border border-gray-700"
          disabled={!canLoadData}
        >
          {DECISION_OPTIONS.map((option) => (
            <option key={option.value || 'all'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={startDate}
          onChange={(event) => handleStartDateChange(event.target.value)}
          className="bg-gray-800 text-gray-200 rounded px-2 py-1 border border-gray-700"
          disabled={!canLoadData}
        />
        <input
          type="date"
          value={endDate}
          onChange={(event) => handleEndDateChange(event.target.value)}
          className="bg-gray-800 text-gray-200 rounded px-2 py-1 border border-gray-700"
          disabled={!canLoadData}
        />
        <select
          value={limit}
          onChange={(event) => handleLimitChange(Number(event.target.value))}
          className="bg-gray-800 text-gray-200 rounded px-2 py-1 border border-gray-700"
          disabled={!canLoadData}
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={clearFilters}
          className="ml-auto text-gray-400 hover:text-gray-200"
          disabled={!canLoadData}
        >
          Clear filters
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {shouldRequireSelection && !hasSelectionContext && (
          <div className="text-xs text-gray-500">Focus on a person or camera to see their feedback timeline.</div>
        )}
        {canLoadData && loading && (
          <div className="text-sm text-gray-400">Loading feedback...</div>
        )}
        {canLoadData && error && !loading && (
          <div className="text-sm text-red-400">{error}</div>
        )}
        {canLoadData && !loading && !error && items.length === 0 && (
          <div className="text-sm text-gray-400">No feedback found for the selected filters.</div>
        )}

        {canLoadData &&
          items.map((item) => {
            const metadataEntries = item.metadata ? Object.entries(item.metadata) : [];
            return (
              <div
                key={item.feedback_id}
                className="border border-gray-700/60 rounded-lg p-3 bg-black/20"
              >
                <div className="flex items-start gap-3">
                  <div className={`text-2xl ${item.decision === 'thumbs_up' ? 'text-green-400' : 'text-red-400'}`}>
                    {item.decision === 'thumbs_up' ? '👍' : '👎'}
                  </div>
                  <div className="flex-1 text-sm text-gray-200">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span>Event {formatTimestamp(item.event_timestamp)}</span>
                      <span>•</span>
                      <span>Recorded {formatTimestamp(item.recorded_at)}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-300">
                      <span className="font-semibold text-gray-100">
                        {cameraDisplayName(item.camera_id)} ({item.camera_id})
                      </span>
                      <span>Env: {item.environment_id}</span>
                      {item.session_id && <span>Session: {item.session_id.slice(0, 8)}…</span>}
                      {typeof item.confidence === 'number' && (
                        <span>Confidence: {Math.round(item.confidence * 100)}%</span>
                      )}
                      {item.source && <span>Source: {item.source}</span>}
                      {item.match_id && <span>Match: {item.match_id}</span>}
                    </div>
                    {item.notes && (
                      <p className="mt-2 text-xs text-gray-300 italic">“{item.notes}”</p>
                    )}
                    {metadataEntries.length > 0 && (
                      <div className="mt-3 text-[11px] text-gray-300">
                        <div className="uppercase tracking-wide text-gray-500 text-[10px] font-semibold mb-1">
                          Metadata
                        </div>
                        <dl className="bg-gray-900/40 border border-gray-800 rounded-md divide-y divide-gray-800">
                          {metadataEntries.map(([key, value]) => (
                            <div key={key} className="grid grid-cols-[120px_minmax(0,1fr)]">
                              <dt className="py-1 px-2 text-gray-500 border-r border-gray-800">
                                {key}
                              </dt>
                              <dd className="py-1 px-2 text-gray-200 break-words">
                                {formatMetadataValue(value)}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
        <div>
          Page {currentPage} of {totalPages}
        </div>
        <div className="space-x-2">
          <button
            type="button"
            onClick={goToPrevPage}
            className={`px-3 py-1 rounded border border-gray-600 ${offset === 0 || !canLoadData ? 'text-gray-500 cursor-not-allowed' : 'text-gray-200 hover:border-gray-400'}`}
            disabled={offset === 0 || !canLoadData}
          >
            Previous
          </button>
          <button
            type="button"
            onClick={goToNextPage}
            className={`px-3 py-1 rounded border border-gray-600 ${!canLoadData || offset + limit >= total ? 'text-gray-500 cursor-not-allowed' : 'text-gray-200 hover:border-gray-400'}`}
            disabled={!canLoadData || offset + limit >= total}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReidFeedbackPanel;
