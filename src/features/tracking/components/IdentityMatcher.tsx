import React, { useState, useEffect } from 'react';
import { TrackingResult } from '../../../services/types/api';
import { useTrackingStore } from '../../../stores/trackingStore';

interface IdentityMatcherProps {
  className?: string;
  onIdentityMatch?: (personId: string, globalId: string) => void;
  onIdentityConflict?: (conflictData: IdentityConflict) => void;
}

interface IdentityConflict {
  personId: string;
  globalId: string;
  confidence: number;
  conflictReason: string;
}

interface IdentityGroup {
  globalId: string;
  personIds: string[];
  confidence: number;
  lastSeen: string;
  camerasSeen: string[];
}

export const IdentityMatcher: React.FC<IdentityMatcherProps> = ({
  className = '',
  onIdentityMatch,
  onIdentityConflict
}) => {
  const { trackingResults } = useTrackingStore();
  const [identityGroups, setIdentityGroups] = useState<IdentityGroup[]>([]);
  const [conflicts, setConflicts] = useState<IdentityConflict[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [matchingThreshold, setMatchingThreshold] = useState(0.8);

  useEffect(() => {
    processIdentityMatching();
  }, [trackingResults, matchingThreshold]);

  const processIdentityMatching = () => {
    const groups: IdentityGroup[] = [];
    const newConflicts: IdentityConflict[] = [];

    // Group tracking results by global ID
    const globalIdMap = new Map<string, TrackingResult[]>();
    
    trackingResults.forEach(track => {
      if (!globalIdMap.has(track.globalId)) {
        globalIdMap.set(track.globalId, []);
      }
      globalIdMap.get(track.globalId)!.push(track);
    });

    // Create identity groups
    globalIdMap.forEach((tracks, globalId) => {
      const personIds = tracks.map(t => t.personId);
      const avgConfidence = tracks.reduce((sum, t) => sum + t.confidence, 0) / tracks.length;
      const lastSeen = tracks.reduce((latest, t) => 
        new Date(t.lastSeen) > new Date(latest) ? t.lastSeen : latest, 
        tracks[0].lastSeen
      );
      
      // Get all cameras seen by this identity
      const camerasSeen = new Set<string>();
      tracks.forEach(track => {
        track.trajectory.forEach(point => {
          camerasSeen.add(point.cameraId);
        });
      });

      groups.push({
        globalId,
        personIds,
        confidence: avgConfidence,
        lastSeen,
        camerasSeen: Array.from(camerasSeen)
      });

      // Check for conflicts (low confidence matches)
      if (avgConfidence < matchingThreshold) {
        newConflicts.push({
          personId: personIds[0],
          globalId,
          confidence: avgConfidence,
          conflictReason: `Low confidence match (${(avgConfidence * 100).toFixed(1)}%)`
        });
      }

      // Check for identity conflicts (same person in multiple groups)
      const personIdCounts = new Map<string, number>();
      personIds.forEach(personId => {
        personIdCounts.set(personId, (personIdCounts.get(personId) || 0) + 1);
      });

      personIdCounts.forEach((count, personId) => {
        if (count > 1) {
          newConflicts.push({
            personId,
            globalId,
            confidence: avgConfidence,
            conflictReason: `Person appears in multiple identity groups`
          });
        }
      });
    });

    setIdentityGroups(groups);
    setConflicts(newConflicts);
  };

  const handleManualMatch = (personId: string, globalId: string) => {
    if (onIdentityMatch) {
      onIdentityMatch(personId, globalId);
    }
  };

  const handleResolveConflict = (conflict: IdentityConflict, action: 'accept' | 'reject') => {
    if (action === 'accept') {
      handleManualMatch(conflict.personId, conflict.globalId);
    }
    
    // Remove conflict from list
    setConflicts(prev => prev.filter(c => 
      c.personId !== conflict.personId || c.globalId !== conflict.globalId
    ));
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-green-100 text-green-800';
    if (confidence >= 0.7) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Identity Matching</h3>
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-600">Threshold:</label>
          <input
            type="range"
            min="0.5"
            max="1.0"
            step="0.05"
            value={matchingThreshold}
            onChange={(e) => setMatchingThreshold(parseFloat(e.target.value))}
            className="w-20"
          />
          <span className="text-sm font-mono">{matchingThreshold.toFixed(2)}</span>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{identityGroups.length}</div>
          <div className="text-sm text-gray-600">Unique Identities</div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {identityGroups.filter(g => g.confidence >= matchingThreshold).length}
          </div>
          <div className="text-sm text-gray-600">High Confidence</div>
        </div>
        <div className="text-center p-3 bg-red-50 rounded-lg">
          <div className="text-2xl font-bold text-red-600">{conflicts.length}</div>
          <div className="text-sm text-gray-600">Conflicts</div>
        </div>
      </div>

      {/* Conflicts Section */}
      {conflicts.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-medium mb-3 text-red-600">Identity Conflicts</h4>
          <div className="space-y-2">
            {conflicts.map((conflict, index) => (
              <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-red-800">
                      Person {conflict.personId} ↔ Global {conflict.globalId}
                    </div>
                    <div className="text-sm text-red-600">{conflict.conflictReason}</div>
                    <div className="text-sm text-gray-600">
                      Confidence: {(conflict.confidence * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleResolveConflict(conflict, 'accept')}
                      className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleResolveConflict(conflict, 'reject')}
                      className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Identity Groups */}
      <div>
        <h4 className="text-md font-medium mb-3">Identity Groups</h4>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {identityGroups.map((group) => (
            <div
              key={group.globalId}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedGroup === group.globalId
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedGroup(
                selectedGroup === group.globalId ? null : group.globalId
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="font-medium">Global ID: {group.globalId}</div>
                  <span className={`px-2 py-1 rounded-full text-xs ${getConfidenceBadge(group.confidence)}`}>
                    {(group.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(group.lastSeen).toLocaleTimeString()}
                </div>
              </div>
              
              <div className="mt-2">
                <div className="text-sm text-gray-600">
                  Person IDs: {group.personIds.join(', ')}
                </div>
                <div className="text-sm text-gray-600">
                  Cameras: {group.camerasSeen.join(', ')}
                </div>
              </div>

              {/* Expanded Details */}
              {selectedGroup === group.globalId && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h5 className="font-medium mb-2">Associated Tracks</h5>
                  <div className="space-y-2">
                    {trackingResults
                      .filter(track => track.globalId === group.globalId)
                      .map(track => (
                        <div key={track.id} className="p-2 bg-gray-50 rounded">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">Person {track.personId}</span>
                            <span className={`text-sm ${getConfidenceColor(track.confidence)}`}>
                              {(track.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            Status: {track.status} • Duration: {Math.round(track.totalDuration / 1000)}s
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Manual Matching Controls */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h5 className="font-medium mb-2">Manual Identity Matching</h5>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Person ID"
            className="px-3 py-1 border border-gray-300 rounded text-sm"
          />
          <span>→</span>
          <input
            type="text"
            placeholder="Global ID"
            className="px-3 py-1 border border-gray-300 rounded text-sm"
          />
          <button className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">
            Match
          </button>
        </div>
      </div>
    </div>
  );
};

export default IdentityMatcher;