import { LandmarkOverlay } from './landmarks.js';

function createLandmarkOverlay(canvas, options = {}) {
  return new LandmarkOverlay(canvas, options);
}

export { LandmarkOverlay, createLandmarkOverlay };
