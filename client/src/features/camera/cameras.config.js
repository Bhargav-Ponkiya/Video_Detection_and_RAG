// The four surveillance feeds. Each `src` is a looping video committed under
// public/cameras/. If a file is missing the card degrades to a "No signal" state
// but still responds to the Simulate controls.

export const CAMERAS = [
  { id: 'cam1', name: 'CAM-01', src: '/cameras/cam1.mp4', location: 'Main Entrance' },
  { id: 'cam2', name: 'CAM-02', src: '/cameras/cam2.mp4', location: 'Parking Lot B' },
  { id: 'cam3', name: 'CAM-03', src: '/cameras/cam3.mp4', location: 'Loading Dock' },
  { id: 'cam4', name: 'CAM-04', src: '/cameras/cam4.mp4', location: 'Perimeter Fence' },
];
