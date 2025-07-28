import { useEffect, useState, useCallback, useRef } from 'react';
import { frameHandler, FrameData } from '../services/frameHandler';
import { useDetectionStore } from '../stores';
import { detectionActions } from '../stores';

export interface FrameSyncConfig {
  enableSync: boolean;
  targetFPS: number;
  maxBufferSize: number;
  syncThreshold: number; // milliseconds
  dropFrameThreshold: number; // milliseconds
}

export interface FrameSyncReturn {
  currentFrame: FrameData | null;
  frameIndex: number;
  isPlaying: boolean;
  fps: number;
  droppedFrames: number;
  play: () => void;
  pause: () => void;
  seekToFrame: (frameIndex: number) => void;
  nextFrame: () => void;
  previousFrame: () => void;
  setPlaybackSpeed: (speed: number) => void;
}

export const useFrameSync = (config: Partial<FrameSyncConfig> = {}): FrameSyncReturn => {
  const {
    enableSync = true,
    targetFPS = 30,
    maxBufferSize = 60,
    dropFrameThreshold = 200,
  } = config;

  const [currentFrame, setCurrentFrame] = useState<FrameData | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fps, setFPS] = useState(0);
  const [droppedFrames, setDroppedFrames] = useState(0);
  const [playbackSpeed, setPlaybackSpeedState] = useState(1.0);

  const frameBuffer = useRef<Map<number, FrameData>>(new Map());
  const playbackTimer = useRef<number | null>(null);
  const lastFrameTime = useRef<number>(0);
  const frameDropCount = useRef<number>(0);
  const fpsCalculator = useRef<number[]>([]);

  // Get detection store
  const { frameIndices, cameraConfigs } = useDetectionStore();

  // Frame handler
  const handleFrame = useCallback((frameData: FrameData) => {
    if (!enableSync) {
      setCurrentFrame(frameData);
      setFrameIndex(frameData.frameIndex);
      detectionActions.updateFrameData(frameData);
      return;
    }

    // Add to buffer
    frameBuffer.current.set(frameData.frameIndex, frameData);

    // Limit buffer size
    if (frameBuffer.current.size > maxBufferSize) {
      const oldestFrame = Math.min(...frameBuffer.current.keys());
      frameBuffer.current.delete(oldestFrame);
    }

    // Process frame if playing
    if (isPlaying) {
      processNextFrame();
    }
  }, [enableSync, maxBufferSize, isPlaying]);

  // Process next frame
  const processNextFrame = useCallback(() => {
    const now = Date.now();
    const timeSinceLastFrame = now - lastFrameTime.current;
    const targetFrameTime = 1000 / (targetFPS * playbackSpeed);

    // Check if we should process next frame
    if (timeSinceLastFrame >= targetFrameTime) {
      const nextFrameIndex = frameIndex + 1;
      const nextFrame = frameBuffer.current.get(nextFrameIndex);

      if (nextFrame) {
        // Frame available - process it
        setCurrentFrame(nextFrame);
        setFrameIndex(nextFrameIndex);
        detectionActions.updateFrameData(nextFrame);
        lastFrameTime.current = now;

        // Update FPS calculation
        updateFPSCalculation();
      } else {
        // Frame not available - check if we should drop or wait
        if (timeSinceLastFrame > dropFrameThreshold) {
          // Drop frame and continue
          setFrameIndex(nextFrameIndex);
          frameDropCount.current++;
          setDroppedFrames(frameDropCount.current);
          lastFrameTime.current = now;
        }
        // Otherwise wait for frame to arrive
      }
    }
  }, [frameIndex, targetFPS, playbackSpeed, dropFrameThreshold]);

  // Update FPS calculation
  const updateFPSCalculation = useCallback(() => {
    const now = Date.now();
    fpsCalculator.current.push(now);

    // Keep only last 60 frames for calculation
    if (fpsCalculator.current.length > 60) {
      fpsCalculator.current.shift();
    }

    // Calculate FPS
    if (fpsCalculator.current.length >= 2) {
      const timeSpan = fpsCalculator.current[fpsCalculator.current.length - 1] - fpsCalculator.current[0];
      const frameCount = fpsCalculator.current.length - 1;
      const calculatedFPS = frameCount / (timeSpan / 1000);
      setFPS(calculatedFPS);
    }
  }, []);

  // Playback timer
  useEffect(() => {
    if (isPlaying && enableSync) {
      playbackTimer.current = window.setInterval(() => {
        processNextFrame();
      }, 1000 / (targetFPS * playbackSpeed * 2)); // Check twice as often as target FPS
    } else {
      if (playbackTimer.current) {
        clearInterval(playbackTimer.current);
        playbackTimer.current = null;
      }
    }

    return () => {
      if (playbackTimer.current) {
        clearInterval(playbackTimer.current);
        playbackTimer.current = null;
      }
    };
  }, [isPlaying, enableSync, targetFPS, playbackSpeed, processNextFrame]);

  // Frame handler registration
  useEffect(() => {
    frameHandler.onFrame(handleFrame);
    
    return () => {
      frameHandler.offFrame(handleFrame);
    };
  }, [handleFrame]);

  // Playback controls
  const play = useCallback(() => {
    setIsPlaying(true);
    lastFrameTime.current = Date.now();
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const seekToFrame = useCallback((targetFrameIndex: number) => {
    const frame = frameBuffer.current.get(targetFrameIndex);
    if (frame) {
      setCurrentFrame(frame);
      setFrameIndex(targetFrameIndex);
      detectionActions.updateFrameData(frame);
    } else {
      // Frame not in buffer, just update index
      setFrameIndex(targetFrameIndex);
    }
  }, []);

  const nextFrame = useCallback(() => {
    const nextFrameIndex = frameIndex + 1;
    seekToFrame(nextFrameIndex);
  }, [frameIndex, seekToFrame]);

  const previousFrame = useCallback(() => {
    const prevFrameIndex = Math.max(0, frameIndex - 1);
    seekToFrame(prevFrameIndex);
  }, [frameIndex, seekToFrame]);

  const setPlaybackSpeed = useCallback((speed: number) => {
    setPlaybackSpeedState(Math.max(0.1, Math.min(5.0, speed)));
  }, []);

  // Legacy frame advancement for existing components
  useEffect(() => {
    if (!enableSync && isPlaying) {
      const interval = setInterval(() => {
        // Update frame indices for each camera
        Object.keys(frameIndices).forEach(cameraId => {
          const config = cameraConfigs[cameraId];
          if (config && config.frameCount > 0) {
            const currentIndex = frameIndices[cameraId];
            const newIndex = (currentIndex + 1) % config.frameCount;
            detectionActions.updateFrameIndex(cameraId, newIndex);
          }
        });
      }, 1000); // 1 FPS

      return () => clearInterval(interval);
    }
  }, [enableSync, isPlaying, frameIndices, cameraConfigs]);

  return {
    currentFrame,
    frameIndex,
    isPlaying,
    fps,
    droppedFrames,
    play,
    pause,
    seekToFrame,
    nextFrame,
    previousFrame,
    setPlaybackSpeed,
  };
};