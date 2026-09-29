# Playback delivery

The public page is `/raidguild-launch-film/`. Its browser requests the stable same-origin `/raidguild-launch-film/media/film.mp4` URL. Caddy maps that exact GET/HEAD path to the existing Remotion service, which streams the object from Railway S3 and forwards byte ranges. No additional service, browser credentials, presigned URL, or CSP expansion is needed.

## Stored export

`media-storage.json` records the immutable object key, SHA-256, verified size and public proxy URL. The selected target is the **paperclip-bucket** bucket in **DarkFactory / production**:

- Railway project: `cc5cc412-f183-4fcc-a88d-5141dc8b8fa7`
- Environment: `b61b88e7-e8a1-40b6-b52f-bc8187032956`
- Bucket resource: `40338b4f-02e0-41d2-a8e9-690bb5ab2543`
- S3 bucket: `paperclip-bucket-ehrsbxvb`, endpoint `https://t3.storageapi.dev`, region `iad`
- Prefix: `remotion/raidguild-launch-film/v15/`

The export is 1920×1080 H.264, 30fps, AAC stereo, with MP4 metadata moved to the front for playback. It is approximately 45 MB. AAC packet padding makes the container duration 85.013 seconds; visual duration is 85 seconds. The original 148 MB master remains separate.

The object is private in S3 but **publicly fetchable through the existing Remotion output proxy**. Store only approved public film exports under this prefix; do not place source recordings or licensed fonts there. The proxy depends on the existing Remotion service and its credentials. No new Railway variables are required for portal-artifacts.

## Update a film

1. Export and review the new master. Create a web copy with FFmpeg, for example H.264 `-preset fast -crf 21 -threads 2`, AAC `-b:a 160k`, `-pix_fmt yuv420p -movflags +faststart`.
2. Compute SHA-256 and upload to a new versioned, hash-suffixed key using the configured S3 client. Set `Content-Type: video/mp4` and SHA-256 metadata. Preserve existing objects; do not silently overwrite another version. Keep credentials only in the upload process or service environment.
3. Verify object size/hash, full decoding and the public proxy's `206` response to `Range: bytes=0-1023`. Check a near-end range as well.
4. Update the one exact upstream path in `Caddyfile`, the non-secret storage manifest, poster, captions and chapter timings as needed.
5. Verify the page with the actual Caddy configuration, then review the pull request. Merging main triggers the existing Railway deployment. The stable player URL remains unchanged.

## Local player review

The normal Docker image uses Caddy and the real remote media route:

```sh
docker build -t portal-artifacts .
docker run --rm -p 8780:8080 portal-artifacts
```

Open `http://localhost:8780/raidguild-launch-film/`. A plain static server can instead use a local copy at `public/raidguild-launch-film/media/film.mp4`; that file is ignored by Git. Do not commit video binaries. Docker builds exclude that local media directory via `.dockerignore`.

## Verification checklist

Check video MIME type, `Accept-Ranges`, `206`/`Content-Range`, seeking after metadata, chapter navigation, captions, fullscreen, download, and the final silent frame. No autoplay. The static player's loading/error UI should stay usable if the upstream service is unavailable.
