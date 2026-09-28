# RaidGuild launch film — Venture beyond. Together.

Editable Three.js source for the 85-second v13 film. The published player is at `/raidguild-launch-film/`; it plays an optimized H.264/AAC export so viewers do not need WebGL or the production assets.

## Restore the production assets

Large media and proprietary Grinder fonts are intentionally omitted from Git. `asset-manifest.json` records their relative paths, sizes and SHA-256 hashes. Restore these from the production asset folder or an authorized source archive:

- `audio/score.wav`: the prepared soundtrack. Alternatively run `python3 make_audio.py /path/to/original-recording.mp3` using the supplied **Desolate Negative Space (1)** recording. This preserves the 3-second silent opening, source 0–78 seconds, fade from source 76.5–77.5, and silent end card through film 85 seconds.
- `assets/video/{walker,oasis,game}.mp4`: the curated experiment captures. These are not the full original desktop screencasts.
- `assets/fonts/Grinder-{Regular,Italic,Retalic}.woff2`: restore from the authorized brand project at `public/brand-fonts/louchi/`. Do not redistribute these font files without appropriate rights. Open font licenses and the original provenance note remain alongside the included fonts.

Missing assets mean the editable preview is not a faithful reproduction. The finished player does not need these assets.

## Preview and export

Requires Python 3, FFmpeg on PATH and a browser with WebGL2. No package installation is needed.

```sh
python3 server.py --port 8777
```

Open `http://127.0.0.1:8777/`. Click Play to hear audio; use the slider or shot menu to review scenes. `?t=32.9` opens at a particular film second. The local server binds only to loopback and is a production tool, not a public service.

**Export review video** renders deterministic frames with WebCodecs and muxes the soundtrack through FFmpeg into `exports/raidguild-signal-music-video-v13.mp4`. **Capture review frames** writes PNGs to `render/`. Both directories are ignored by Git. With Pillow installed, `python3 qa/contact_sheet.py` assembles captures and compares repeat frames.

## Timing and provenance

The film is 1920×1080 at 30fps, 2,550 frames. Song time is film time minus three seconds. `data/music.json` uses song time; `data/lyrics.srt` uses film time. The closing “We built it / We own it / Come ride” is editorial text, not a spliced vocal excerpt.

The timeline moves beyond Louchi into **THE FUTURE / BUILD IT TOGETHER**, then dissolves before the horizon flyover. Brand-era years are approximate user-supplied labels, not verified election dates. 2019 marks the guild origin; Ven is undated. Featured stewards are Dekan (knowledge), ECWireless (infrastructure) and Louchi (brand).

In v13, the timeline sits over a soft translucent gradient so background line art remains visible. A localized pink-white glow, expanding ring and deterministic sparks accent the gears engaging at film 10.82 seconds. The scrim dissolves with the future timeline. Shot boundaries and soundtrack timing are unchanged.

See `THIRD_PARTY_NOTICES.md` for artwork, font and engine credits, and `HOSTING.md` for the player’s media delivery setup. The line shader adaptation retains mexicat/pdoom-video’s MIT license. The reference film’s song and scenes are not included.
