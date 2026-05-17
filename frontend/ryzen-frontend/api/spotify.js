const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';
const NOW_PLAYING_ENDPOINT = 'https://api.spotify.com/v1/me/player/currently-playing';
const RECENTLY_PLAYED_ENDPOINT = 'https://api.spotify.com/v1/me/player/recently-played?limit=1';

async function getAccessToken() {
  const client_id = process.env.SPOTIFY_CLIENT_ID?.trim();
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET?.trim();
  const refresh_token = process.env.SPOTIFY_REFRESH_TOKEN?.trim();

  if (!client_id || !client_secret || !refresh_token) {
    throw new Error('Missing Spotify credentials');
  }

  const basic = Buffer.from(`${client_id}:${client_secret}`).toString('base64');
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token }),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`Token refresh: ${data.error_description || data.error}`);
  }
  return data.access_token;
}

// ─── ITUNES PREVIEW FALLBACK ───
async function getItunesPreview(artist, title) {
  try {
    const q = encodeURIComponent(`${artist} ${title}`);
    const url = `https://itunes.apple.com/search?term=${q}&media=music&limit=1`;
    const res = await fetch(url);
    const data = await res.json();
    return data.results?.[0]?.previewUrl || null;
  } catch (e) {
    return null;
  }
}

// ─── DEEZER PREVIEW FALLBACK ───
async function getDeezerPreview(artist, title) {
  try {
    const q = encodeURIComponent(`${artist} ${title}`);
    const url = `https://api.deezer.com/search?q=${q}&limit=1`;
    const res = await fetch(url);
    const data = await res.json();
    return data.data?.[0]?.preview || null;
  } catch (e) {
    return null;
  }
}

async function findPreview(artist, title) {
  // Try iTunes first (higher hit rate for mainstream tracks)
  let preview = await getItunesPreview(artist, title);
  if (preview) return preview;

  // Fallback to Deezer
  preview = await getDeezerPreview(artist, title);
  return preview;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const access_token = await getAccessToken();

    // ─── NOW PLAYING ───
    const npRes = await fetch(NOW_PLAYING_ENDPOINT, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (npRes.status === 200) {
      const song = await npRes.json();
      if (song?.item) {
        const artistStr = song.item.artists.map(a => a.name).join(' ');
        const previewUrl = await findPreview(artistStr, song.item.name);

        // ─── FIX: Include playedAt for paused tracks ───
        // When a song is paused (is_playing: false), we still have track info
        // but no playedAt from Spotify. Use current time so the frontend can
        // show "PLAYED JUST NOW" instead of falling through to "SILENCE".
        const playedAt = song.is_playing
          ? new Date().toISOString()
          : new Date(Date.now() - (song.progress_ms || 0)).toISOString();

        return res.status(200).json({
          isPlaying: song.is_playing ?? true,
          title: song.item.name,
          artist: artistStr,
          album: song.item.album?.name || '',
          albumImageUrl: song.item.album?.images?.[0]?.url || '',
          progressMs: song.progress_ms || 0,
          durationMs: song.item.duration_ms || 0,
          previewUrl,
          playedAt,
        });
      }
    }

    // ─── RECENTLY PLAYED ───
    const recentRes = await fetch(RECENTLY_PLAYED_ENDPOINT, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!recentRes.ok) throw new Error(`Recent ${recentRes.status}`);
    const recent = await recentRes.json();

    if (recent?.items?.length > 0) {
      const last = recent.items[0];
      const artistStr = last.track.artists.map(a => a.name).join(' ');
      const previewUrl = await findPreview(artistStr, last.track.name);

      return res.status(200).json({
        isPlaying: false,
        title: last.track.name,
        artist: artistStr,
        album: last.track.album?.name || '',
        albumImageUrl: last.track.album?.images?.[0]?.url || '',
        playedAt: last.played_at,
        previewUrl,
      });
    }

    return res.status(200).json({
      isPlaying: false, title: 'Silence', artist: 'No History',
      album: '', albumImageUrl: '', previewUrl: null, playedAt: null,
    });

  } catch (err) {
    console.error('API Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}