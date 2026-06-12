import { useEffect, useRef, useState } from 'react';
import { classifySeverity } from './detectionClasses.js';

const DETECT_INTERVAL_MS = 600;
const SCORE_THRESHOLD = 0.5;

/**
 * Runs COCO-SSD detection on a video element on a throttled interval.
 * Only runs while: model ready, `enabled` true, the video is actually playing,
 * and the tab is visible. Returns the latest predictions + derived severity.
 *
 * @param {object} opts
 * @param {React.RefObject<HTMLVideoElement>} opts.videoRef
 * @param {object|null} opts.model           COCO-SSD model (or null)
 * @param {boolean} opts.enabled             gate detection on/off
 * @returns {{ predictions: Array, severity: {severity,label,matched}|null }}
 */
export default function useObjectDetection({ videoRef, model, enabled }) {
  const [predictions, setPredictions] = useState([]);
  const [severity, setSeverity] = useState(null);
  const busyRef = useRef(false);

  useEffect(() => {
    if (!enabled || !model || !videoRef.current) {
      setPredictions([]);
      setSeverity(null);
      return undefined;
    }

    let cancelled = false;
    const video = videoRef.current;

    const canRun = () => {
      if (document.hidden) return false;
      if (!video || video.paused || video.ended) return false;
      // need real frame dimensions before inference
      return video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0;
    };

    const tick = async () => {
      if (cancelled || busyRef.current || !canRun()) return;
      busyRef.current = true;
      try {
        const preds = await model.detect(video);
        if (cancelled) return;
        setPredictions(preds);
        setSeverity(classifySeverity(preds, SCORE_THRESHOLD));
      } catch {
        // a transient inference error shouldn't crash the tile
        if (!cancelled) {
          setPredictions([]);
          setSeverity(null);
        }
      } finally {
        busyRef.current = false;
      }
    };

    const id = setInterval(tick, DETECT_INTERVAL_MS);
    // kick off an immediate first pass once a frame is available
    tick();

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [enabled, model, videoRef]);

  return { predictions, severity };
}
