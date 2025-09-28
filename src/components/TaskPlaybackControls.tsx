import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { PlaybackStatusResponse } from '../types/api';

interface TaskPlaybackControlsProps {
  taskId: string | null;
  playbackStatus: PlaybackStatusResponse | null;
  onPause: () => Promise<PlaybackStatusResponse | null>;
  onResume: () => Promise<PlaybackStatusResponse | null>;
  onRefresh: () => Promise<PlaybackStatusResponse | null>;
}

type ActionInFlight = 'toggle' | 'refresh' | null;

const getStatusBadgeStyles = (state: PlaybackStatusResponse['state'] | undefined) => {
  switch (state) {
    case 'playing':
      return 'bg-green-500/20 text-green-300 border border-green-500/40';
    case 'paused':
      return 'bg-yellow-500/20 text-yellow-200 border border-yellow-500/40';
    case 'stopped':
      return 'bg-gray-500/20 text-gray-300 border border-gray-500/40';
    default:
      return 'bg-gray-500/10 text-gray-400 border border-gray-600/40';
  }
};

const formatTimestamp = (timestamp?: string) => {
  if (!timestamp) return '--';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
};

const TaskPlaybackControls: React.FC<TaskPlaybackControlsProps> = ({
  taskId,
  playbackStatus,
  onPause,
  onResume,
  onRefresh,
}) => {
  const [status, setStatus] = useState<PlaybackStatusResponse | null>(playbackStatus);
  const [actionInFlight, setActionInFlight] = useState<ActionInFlight>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStatus(playbackStatus);
  }, [playbackStatus]);

  const toggleDisabled = useMemo(() => !taskId || actionInFlight === 'toggle', [taskId, actionInFlight]);
  const refreshDisabled = useMemo(() => !taskId || actionInFlight === 'refresh', [taskId, actionInFlight]);

  const runAction = useCallback(
    async (action: ActionInFlight, handler: () => Promise<PlaybackStatusResponse | null>) => {
      if (!taskId) {
        return;
      }

      setError(null);
      setActionInFlight(action);

      try {
        const result = await handler();
        if (result) {
          setStatus(result);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update playback state';
        setError(message);
      } finally {
        setActionInFlight(null);
      }
    },
    [taskId]
  );

  const handleToggle = useCallback(() => {
    const handler = status?.state === 'paused' ? onResume : onPause;
    return runAction('toggle', handler);
  }, [runAction, onPause, onResume, status?.state]);

  const handleRefresh = useCallback(() => runAction('refresh', onRefresh), [runAction, onRefresh]);

  const statusBadge = useMemo(() => {
    const state = status?.state;
    const text = state ? state.toUpperCase() : 'UNKNOWN';
    const baseStyles = 'px-3 py-1 rounded-full text-xs font-semibold tracking-wide';
    return (
      <span className={`${baseStyles} ${getStatusBadgeStyles(state)}`}>
        {text}
      </span>
    );
  }, [status?.state]);

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-100">Playback Controls</h2>
          <p className="text-sm text-gray-400">
            Issue pause and resume commands against the active processing task.
          </p>
        </div>
        {statusBadge}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          onClick={handleToggle}
          disabled={toggleDisabled}
          className="inline-flex items-center rounded-md bg-orange-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 disabled:bg-gray-600 disabled:text-gray-300 disabled:cursor-not-allowed"
        >
          {actionInFlight === 'toggle'
            ? 'Updating...'
            : status?.state === 'paused'
              ? '▶︎ Resume'
              : '⏸ Pause'}
        </button>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshDisabled}
          className="inline-flex items-center rounded-md border border-gray-600 px-3 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700 disabled:text-gray-500 disabled:border-gray-700 disabled:bg-transparent disabled:cursor-not-allowed"
        >
          {actionInFlight === 'refresh' ? 'Refreshing...' : 'Refresh Status'}
        </button>
      </div>

      <dl className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
        <div>
          <dt className="font-medium text-gray-400">Task</dt>
          <dd className="mt-1 text-gray-100">{taskId ?? 'No active task'}</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-400">Last Transition</dt>
          <dd className="mt-1 text-gray-100">{formatTimestamp(status?.last_transition_at)}</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-400">Last Frame</dt>
          <dd className="mt-1 text-gray-100">
            {typeof status?.last_frame_index === 'number' ? status.last_frame_index : '--'}
          </dd>
        </div>
      </dl>

      {status?.last_error && (
        <div className="mt-3 rounded border border-red-500/40 bg-red-900/40 px-3 py-2 text-sm text-red-200">
          Backend reported error: {status.last_error}
        </div>
      )}

      {error && (
        <div className="mt-3 rounded border border-yellow-500/40 bg-yellow-900/40 px-3 py-2 text-sm text-yellow-200">
          {error}
        </div>
      )}

      {!taskId && (
        <div className="mt-3 rounded border border-blue-500/40 bg-blue-900/40 px-3 py-2 text-sm text-blue-200">
          Start a processing task to enable playback controls.
        </div>
      )}
    </div>
  );
};

export default TaskPlaybackControls;
