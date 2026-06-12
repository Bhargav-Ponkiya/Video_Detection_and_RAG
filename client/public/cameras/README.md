# Camera video placeholders

The Camera Monitor (`/monitor`) plays four looping local videos as its default
feeds. Drop your own clips here with these exact names:

```
client/public/cameras/cam1.mp4
client/public/cameras/cam2.mp4
client/public/cameras/cam3.mp4
client/public/cameras/cam4.mp4
```

They are referenced from `client/src/features/camera/cameras.config.js`.

## Notes

- **No file? No problem.** If a `camN.mp4` is missing, that tile degrades to a
  "NO SIGNAL — add camN.mp4" placeholder and still responds to the **Simulate**
  buttons, so the demo always works.
- Any browser-playable MP4 (H.264) works. Short loops (10–30s) are ideal.
- For a live detection demo, click **Use webcam** on any tile to bind your real
  camera (only one tile holds the webcam at a time). The model then runs real
  COCO-SSD inference on the webcam frames.
- These files are intentionally **not committed** (binaries) — add your own.

## Where to find sample clips

Any free stock-video site (e.g. Pexels, Pixabay) — search for "street", "people
walking", "parking lot", "wildlife". Download as MP4 and rename to `camN.mp4`.
