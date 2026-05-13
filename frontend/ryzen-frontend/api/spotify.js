export default async function handler(req, res) {
  const envKeys = Object.keys(process.env).filter(k => k.includes('SPOTIFY'));
  console.log("SPOTIFY ENV KEYS FOUND:", envKeys);
  console.log("ALL ENV KEYS COUNT:", Object.keys(process.env).length);

  // --- 1. CORS (so your Vite frontend can call this) ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // --- 2. Load & validate env vars INSIDE the handler ---
  // Do NOT compute these at the module level. If .env is missing at boot,
  // you encode "undefined:undefined" into the Basic header forever.
  const client_id = process.env.SPOTIFY_CLIENT_ID?.trim();
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET?.trim();
  const refresh_token = process.env.SPOTIFY_REFRESH_TOKEN?.trim();

  console.log("CLIENT ID DETECTED:", client_id ? "YES" : "NO");

  if (!client_id || !client_secret || !refresh_token) {
    console.error("Missing Spotify credentials", {
      hasId: !!client_id,
      hasSecret: !!client_secret,
      hasToken: !!refresh_token,
    });
    return res.status(500).json({ error: "Server misconfiguration: missing Spotify credentials" });
  }

  // --- 3. Get Access Token ---
  const basic = Buffer.from(`${client_id}:${client_secret}`).toString('base64');
  let tokenData;

  try {
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token,
      }),
    });

    tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Spotify token endpoint failed:", tokenData);
      return res.status(401).json({
        error: "Spotify authentication failed",
        details: tokenData.error_description || tokenData.error || "Unknown",
      });
    }
  } catch (err) {
    console.error("Exception during token fetch:", err);
    return res.status(500).json({ error: "Failed to reach Spotify token endpoint" });
  }

  // --- 4. Get Now Playing ---
  try {
    const nowPlayingRes = await fetch(
      "https://api.spotify.com/v1/me/player/currently-playing",
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );

    if (nowPlayingRes.status === 200) {
      const song = await nowPlayingRes.json();
      if (song?.item) {
        return res.status(200).json({
          isPlaying: song.is_playing ?? true,
          title: song.item.name,
          artist: song.item.artists.map((a) => a.name).join(", "),
          album: song.item.album.name,    
          albumImageUrl: song.item.album.images[0]?.url || "",
          progressMs: song.progress_ms,
          durationMs: song.item.duration_ms,
        });
      }
    }

    // --- 5. Fallback: Recently Played ---
    const recentRes = await fetch(
      "https://api.spotify.com/v1/me/player/recently-played?limit=1",
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );

    if (!recentRes.ok) {
      throw new Error(`Recently played returned ${recentRes.status}`);
    }

    const recent = await recentRes.json();

    if (recent?.items?.length > 0) {
      const last = recent.items[0];
      return res.status(200).json({
        isPlaying: false,
        title: last.track.name,
        artist: last.track.artists.map((a) => a.name).join(", "),
        album: song.item.album.name,    
        albumImageUrl: last.track.album.images[0]?.url || "",
        playedAt: last.played_at,
      });
    }

    // --- 6. Ultimate fallback ---
    return res.status(200).json({
      isPlaying: false,
      title: "Silence",
      artist: "No History Found",
      albumImageUrl: "",
    });
  } catch (err) {
    console.error("Player fetch error:", err);
    return res.status(500).json({ error: err.message });
  }
}