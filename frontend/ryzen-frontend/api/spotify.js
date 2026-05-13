// api/spotify.js
const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const refresh_token = process.env.SPOTIFY_REFRESH_TOKEN;

// Use Buffer for a more robust Node.js base64 encoding
const basic = Buffer.from(`${client_id}:${client_secret}`).toString('base64');
const NOW_PLAYING_ENDPOINT = `https://api.spotify.com/v1/me/player/currently-playing`;
const RECENTLY_PLAYED_ENDPOINT = `https://api.spotify.com/v1/me/player/recently-played`;
const TOKEN_ENDPOINT = `https://accounts.spotify.com/api/token`;

const getAccessToken = async () => {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token,
    }),
  });
  return response.json();
};

export default async function handler(req, res) {
  const { access_token } = await getAccessToken();

  try {
    // 1. Try "Now Playing"
    const nowPlayingRes = await fetch(NOW_PLAYING_ENDPOINT, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (nowPlayingRes.status === 200) {
      const song = await nowPlayingRes.json();
      if (song && song.item) {
        return res.status(200).json({
          isPlaying: true,
          title: song.item.name,
          artist: song.item.artists.map((_artist) => _artist.name).join(', '),
          albumImageUrl: song.item.album.images[0].url,
          progressMs: song.progress_ms,
          durationMs: song.item.duration_ms,
        });
      }
    }

    // 2. Fallback to "Recently Played"
    const recentRes = await fetch(RECENTLY_PLAYED_ENDPOINT, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const recent = await recentRes.json();

    // The "Safety Check" - prevents the 'reading 0' crash
    if (recent && recent.items && recent.items.length > 0) {
      const lastSong = recent.items[0];
      return res.status(200).json({
        isPlaying: false,
        title: lastSong.track.name,
        artist: lastSong.track.artists.map((_artist) => _artist.name).join(', '),
        albumImageUrl: lastSong.track.album.images[0].url,
        playedAt: lastSong.played_at,
      });
    }

    // 3. Absolute Fallback (if no history at all)
    return res.status(200).json({
      isPlaying: false,
      title: "Silence",
      artist: "No History Found",
      albumImageUrl: "",
    });

  } catch (error) {
    console.error("Spotify API Error:", error);
    return res.status(500).json({ error: "Failed to fetch Spotify data" });
  }
}