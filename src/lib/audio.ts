/**
 * Background song audio. Lives in a hidden iframe attached to <body>, so it
 * keeps playing while the learner browses the app.
 */
const HOST_ID = "bitquest-background-audio";

export function playBackgroundAudio(videoId: string) {
  stopBackgroundAudio();
  const frame = document.createElement("iframe");
  frame.id = HOST_ID;
  frame.title = "Background song";
  frame.allow = "autoplay";
  frame.style.position = "fixed";
  frame.style.width = "1px";
  frame.style.height = "1px";
  frame.style.opacity = "0";
  frame.style.pointerEvents = "none";
  frame.style.bottom = "0";
  frame.style.left = "0";
  frame.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1&controls=0`;
  document.body.appendChild(frame);
}

export function stopBackgroundAudio() {
  document.getElementById(HOST_ID)?.remove();
}

export function isBackgroundAudioPlaying(): boolean {
  return Boolean(document.getElementById(HOST_ID));
}