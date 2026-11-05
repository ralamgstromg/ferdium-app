// YouTube and YouTube Music, including their subdomains.
export const YOUTUBE_HOSTS = /^(?:[\w-]+\.)?youtube\.com$/;

// Video ads play in the same <video> element as the video. Network and JSON
// filters can miss some of them, so while an ad is showing this skips it: it
// clicks the skip buttons, mutes the ad and jumps to its end. The mute is
// undone when the ad ends, but only if this script set it.
export const YOUTUBE_AD_SKIP_SCRIPT = `(() => {
  if (window.__ferdiumYoutubeAdSkip) return;
  window.__ferdiumYoutubeAdSkip = true;

  const SKIP_BUTTONS = '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button';
  const CLOSE_BUTTONS = '.ytp-ad-overlay-close-button';
  let mutedByFerdium = false;

  const tick = () => {
    const player = document.querySelector('#movie_player');
    const video = document.querySelector('video.html5-main-video, video');
    if (!player || !video) return;

    if (!player.classList.contains('ad-showing')) {
      if (mutedByFerdium) video.muted = false;
      mutedByFerdium = false;
      return;
    }

    document.querySelectorAll(SKIP_BUTTONS).forEach(button => button.click());
    document.querySelectorAll(CLOSE_BUTTONS).forEach(button => button.click());
    if (Number.isFinite(video.duration) && video.duration > 0) {
      if (!video.muted) {
        video.muted = true;
        mutedByFerdium = true;
      }
      video.currentTime = video.duration;
    }
  };

  setInterval(tick, 250);
})();`;
