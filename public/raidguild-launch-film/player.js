(() => {
  'use strict';

  const video = document.querySelector('#film');
  const start = document.querySelector('#start');
  const overlay = document.querySelector('#screen-overlay');
  const status = document.querySelector('#player-status');
  const error = document.querySelector('#player-error');
  const chapterList = document.querySelector('#chapter-list');
  const captionsToggle = document.querySelector('#captions-toggle');
  const download = document.querySelector('#download');
  const trackElement = document.querySelector('#lyrics-track');
  const localMedia = new URL('./media/film.mp4', document.location.href);
  let chapters = [];
  let chapterButtons = [];
  let requestId = 0;
  let mediaFailed = false;

  const timeLabel = seconds => {
    const whole = Math.floor(seconds);
    return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
  };

  function setStatus(message) { status.textContent = message; }
  function showError(message) {
    mediaFailed = true;
    error.textContent = message;
    error.hidden = false;
    overlay.hidden = true;
    setStatus('Film unavailable');
  }
  function clearError() {
    mediaFailed = false;
    error.hidden = true;
    error.textContent = '';
  }

  function updateChapter() {
    if (!chapters.length) return;
    const current = video.currentTime || 0;
    let selected = 0;
    for (let i = 0; i < chapters.length; i++) {
      if (current + .05 >= chapters[i].time) selected = i;
      else break;
    }
    chapterButtons.forEach((button, i) => {
      if (i === selected) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
  }

  async function playVideo() {
    if (mediaFailed) return;
    try {
      await video.play();
      clearError();
      overlay.hidden = true;
    } catch (reason) {
      if (video.error) {
        showError('The film could not be loaded. Please try the download link or return later.');
      } else {
        setStatus('Playback was blocked. Use the video Play control to continue.');
        overlay.hidden = false;
      }
    }
  }

  function waitForMetadata() {
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const clean = () => {
        video.removeEventListener('loadedmetadata', ready);
        video.removeEventListener('error', failed);
      };
      const ready = () => { clean(); resolve(); };
      const failed = () => { clean(); reject(new Error('Media metadata unavailable')); };
      video.addEventListener('loadedmetadata', ready, { once: true });
      video.addEventListener('error', failed, { once: true });
    });
  }

  async function goToChapter(chapter) {
    const thisRequest = ++requestId;
    setStatus(`Opening ${chapter.title}…`);
    try {
      await waitForMetadata();
      if (thisRequest !== requestId || mediaFailed) return;
      video.currentTime = Math.min(chapter.time, Math.max(0, video.duration - .05));
      updateChapter();
      await playVideo();
    } catch {
      if (thisRequest === requestId) showError('The film could not be loaded. Please try the download link or return later.');
    }
  }

  function buildChapters(items) {
    chapters = items;
    chapterList.replaceChildren();
    chapterButtons = chapters.map((chapter, index) => {
      const li = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'chapter';
      button.setAttribute('aria-label', `Play ${chapter.title} at ${timeLabel(chapter.time)}`);
      const meta = document.createElement('span');
      meta.className = 'chapter-meta';
      meta.textContent = `${String(index + 1).padStart(2, '0')} / ${timeLabel(chapter.time)}`;
      const title = document.createElement('span');
      title.className = 'chapter-title';
      title.textContent = chapter.title;
      const detail = document.createElement('span');
      detail.className = 'chapter-detail';
      detail.textContent = chapter.detail;
      button.append(meta, title, detail);
      button.addEventListener('click', () => goToChapter(chapter));
      li.append(button);
      chapterList.append(li);
      return button;
    });
    updateChapter();
  }

  start.addEventListener('click', playVideo);
  video.addEventListener('loadedmetadata', () => {
    clearError();
    setStatus(`Ready to watch · ${timeLabel(video.duration || 85)}`);
    updateChapter();
  });
  video.addEventListener('playing', () => { overlay.hidden = true; setStatus('Playing'); });
  video.addEventListener('pause', () => { if (!video.ended && !mediaFailed) setStatus('Paused'); });
  video.addEventListener('ended', () => { setStatus('Film complete'); });
  video.addEventListener('seeking', () => { if (!mediaFailed) setStatus('Seeking…'); });
  video.addEventListener('seeked', () => { if (!mediaFailed) setStatus(video.paused ? 'Paused' : 'Playing'); updateChapter(); });
  video.addEventListener('timeupdate', updateChapter);
  video.addEventListener('error', () => showError('The film could not be loaded. Please try the download link or return later.'));
  trackElement.addEventListener('load', () => { captionsToggle.disabled = false; });
  trackElement.addEventListener('error', () => { captionsToggle.disabled = true; });
  captionsToggle.addEventListener('click', () => {
    const track = video.textTracks[0];
    if (!track) return;
    const showing = track.mode !== 'showing';
    track.mode = showing ? 'showing' : 'disabled';
    captionsToggle.setAttribute('aria-pressed', String(showing));
  });

  fetch('./config.json', { cache: 'no-store' })
    .then(response => { if (!response.ok) throw new Error('Configuration unavailable'); return response.json(); })
    .then(config => {
      const source = new URL(config.media, document.location.href);
      if (source.origin !== document.location.origin || source.pathname !== localMedia.pathname || source.search || source.hash) {
        throw new Error('Film source must be the local media path');
      }
      if (!Array.isArray(config.chapters) || config.chapters.length !== 8 ||
          !config.chapters.every((c, i) => Number.isFinite(c.time) && c.time >= 0 && c.time < 85 &&
            typeof c.title === 'string' && typeof c.detail === 'string' &&
            (i === 0 || c.time > config.chapters[i - 1].time))) {
        throw new Error('Invalid chapter list');
      }
      download.href = source.href;
      buildChapters(config.chapters);
      captionsToggle.disabled = video.textTracks.length === 0;
      video.src = source.href;
      video.load();
    })
    .catch(() => showError('The launch film player is not ready. Please return later.'));
})();
