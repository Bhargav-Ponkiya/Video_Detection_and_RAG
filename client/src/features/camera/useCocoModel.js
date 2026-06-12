import { useEffect, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

// Module-level singleton: the COCO-SSD model is large, so we load it once and
// share the same instance across every camera tile.
let modelPromise = null;
let sharedModel = null;
let loadError = null;

function loadModelOnce() {
  if (!modelPromise) {
    modelPromise = (async () => {
      await tf.ready();
      // 'mobilenet_v2' offers higher classification accuracy than the 'lite' version
      const model = await cocoSsd.load({ base: 'mobilenet_v2' });
      sharedModel = model;
      return model;
    })().catch((err) => {
      loadError = err;
      // reset so a future mount can retry
      modelPromise = null;
      throw err;
    });
  }
  return modelPromise;
}

/**
 * Loads (or reuses) the shared COCO-SSD model.
 * @returns {{ model: object|null, status: 'loading'|'ready'|'error' }}
 */
export default function useCocoModel() {
  const [model, setModel] = useState(sharedModel);
  const [status, setStatus] = useState(
    sharedModel ? 'ready' : loadError ? 'error' : 'loading'
  );

  useEffect(() => {
    let alive = true;

    if (sharedModel) {
      setModel(sharedModel);
      setStatus('ready');
      return;
    }

    setStatus('loading');
    loadModelOnce()
      .then((m) => {
        if (!alive) return;
        setModel(m);
        setStatus('ready');
      })
      .catch(() => {
        if (!alive) return;
        setStatus('error');
      });

    return () => {
      alive = false;
    };
  }, []);

  return { model, status };
}
