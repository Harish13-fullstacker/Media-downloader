import { useState, useEffect, useRef } from 'react'

/* ================= CONFIG ================= */
// Put your NEW YouTube API key here (or in .env as VITE_YOUTUBE_API_KEY)
const YOUTUBE_API_KEY = 'AIzaSyCdDGCAF05RyJ8C9QY4kzZSej3xgWzVIs4'

// Your Python backend URL
const API_URL = 'http://localhost:8000'

const TAGS = ['Tamil Hits', 'Anirudh Musical', 'A.R. Rahman', 'Lo-Fi Chill', 'EDM Party']

/* ================= THEME ================= */
const C = {
  bg: '#0b0b14', lowest: '#07070d', low: '#161622', high: '#232331', highest: '#2f2f40',
  text: '#f1eefc', textVar: '#e5bdc1', primary: '#ffb2bd', pc: '#ff4e7b', pink: '#ff2a6d', cyan: '#6ff2ff', error: '#ffb4ab',
}
const gradBtn = `linear-gradient(90deg, ${C.pc}, ${C.pink})`

/* ================= STYLES (index.css merged in) ================= */
const css = `
  /* ---- global (was index.css) ---- */
  * { margin: 0; padding: 0; box-sizing: border-box; }
  :root { color-scheme: dark; font: 16px/145% system-ui, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; background: ${C.bg}; color: ${C.text}; }
  body { background: ${C.bg}; min-height: 100vh; width: 100%; overflow-x: hidden; }
  #root { width: 100%; max-width: 100%; min-height: 100svh; display: flex; flex-direction: column; background: ${C.bg}; }

  /* ---- app ---- */
  .sf { font-family: 'Plus Jakarta Sans', sans-serif; background: ${C.bg}; color: ${C.text}; min-height: 100vh; display: flex; flex-direction: column; text-align: left; }
  .sf h1, .sf h2, .sf h3 { color: ${C.text}; font-family: inherit; margin: 0; }
  .sf p { margin: 0; }
  .sf .ms { font-family: 'Material Symbols Outlined'; font-weight: normal; font-style: normal; line-height: 1; display: inline-block; letter-spacing: normal; text-transform: none; white-space: nowrap; -webkit-font-smoothing: antialiased; }
  .sf button { font-family: inherit; cursor: pointer; border: none; transition: transform .15s, filter .2s, background .2s, box-shadow .2s; }
  .sf button:hover:not(:disabled) { filter: brightness(1.15); }
  .sf button:active:not(:disabled) { transform: scale(.95); }
  .sf button:disabled { opacity: .55; cursor: not-allowed; }
  .sf button:focus-visible, .sf input:focus-visible { outline: 2px solid ${C.cyan}; outline-offset: 2px; }

  /* animated aurora background */
  .sf .aurora { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
  .sf .blob { position: absolute; border-radius: 50%; filter: blur(110px); animation: sfFloat 14s ease-in-out infinite; }
  .sf .blob.a { top: -140px; left: -120px; width: 460px; height: 460px; background: rgba(255,78,123,.28); }
  .sf .blob.b { top: 20%; right: -140px; width: 520px; height: 520px; background: rgba(0,216,231,.18); animation-delay: -5s; }
  .sf .blob.c { bottom: -160px; left: 30%; width: 420px; height: 420px; background: rgba(150,80,255,.16); animation-delay: -9s; }
  .sf .grid-bg { position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px); background-size: 56px 56px; mask-image: radial-gradient(ellipse at 50% 20%, #000 20%, transparent 75%); -webkit-mask-image: radial-gradient(ellipse at 50% 20%, #000 20%, transparent 75%); }

  /* hero title */
  .sf .hero-h { font-size: clamp(38px, 7vw, 84px); line-height: 1.02; font-weight: 800; letter-spacing: -0.04em; max-width: 960px; }
  .sf .shine { background: linear-gradient(90deg, ${C.primary}, ${C.pc}, ${C.cyan}, ${C.pc}, ${C.primary}); background-size: 250% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; animation: sfShine 6s linear infinite; }

  /* search */
  .sf .search-glow { position: absolute; inset: -3px; border-radius: 24px; background: linear-gradient(90deg, ${C.pc}, ${C.cyan}, ${C.primary}, ${C.pc}); background-size: 300% 100%; filter: blur(14px); opacity: .55; animation: sfShine 8s linear infinite; }
  .sf .chip { transition: all .2s; }
  .sf .chip:hover { background: ${C.highest} !important; color: ${C.cyan} !important; transform: translateY(-2px); }

  /* layout */
  .sf .grid { display: grid; grid-template-columns: 1fr; gap: 1.75rem; }
  @media (min-width: 1024px) { .sf .grid { grid-template-columns: 7fr 5fr; } .sf .sticky { position: sticky; top: 96px; } }

  /* song cards */
  .sf .song { position: relative; transition: transform .25s, box-shadow .25s, background .25s; border: 1px solid rgba(255,255,255,.06); }
  .sf .song::before { content: ''; position: absolute; left: 0; top: 14%; bottom: 14%; width: 3px; border-radius: 3px; background: linear-gradient(${C.pc}, ${C.cyan}); opacity: 0; transition: opacity .25s; }
  .sf .song:hover { background: rgba(47,47,64,.75) !important; transform: translateX(4px); box-shadow: 0 12px 36px rgba(255,78,123,.22) !important; }
  .sf .song:hover::before, .sf .song.on::before { opacity: 1; }
  .sf .song img { transition: transform .4s; }
  .sf .song:hover img { transform: scale(1.12); }

  /* player */
  .sf .player-card { position: relative; border-radius: 28px; padding: 18px; background: rgba(35,35,49,.65); backdrop-filter: blur(26px); box-shadow: 0 24px 60px rgba(0,0,0,.65), 0 0 0 1px rgba(255,255,255,.07); }
  .sf .player-card::after { content: ''; position: absolute; inset: -1px; border-radius: 29px; padding: 1px; background: linear-gradient(135deg, rgba(255,78,123,.7), transparent 40%, rgba(111,242,255,.6)); -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none; }
  .sf .vinyl { width: 52px; height: 52px; border-radius: 50%; flex-shrink: 0; position: relative; background: conic-gradient(#111, #333, #111, #2a2a2a, #111); box-shadow: 0 0 18px rgba(255,78,123,.45); display: flex; align-items: center; justify-content: center; animation: sfSpin 4s linear infinite; }
  .sf .vinyl.paused { animation-play-state: paused; }
  .sf .vinyl img { width: 22px; height: 22px; border-radius: 50%; object-fit: cover; }
  .sf .vinyl::after { content: ''; position: absolute; width: 6px; height: 6px; border-radius: 50%; background: ${C.bg}; }

  /* animations */
  @keyframes sfSpin { to { transform: rotate(360deg); } }
  @keyframes sfBar { 0%,100% { transform: scaleY(.3); } 50% { transform: scaleY(1); } }
  @keyframes sfShine { to { background-position: 250% 0; } }
  @keyframes sfFloat { 0%,100% { transform: translate(0,0); } 50% { transform: translate(40px,-30px); } }
  @keyframes sfRise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
  .sf .spin { animation: sfSpin 1s linear infinite; }
  .sf .bar { width: 4px; border-radius: 4px; height: 100%; transform-origin: bottom; animation: sfBar 1s ease-in-out infinite; }
  .sf .hero-in { animation: sfRise .7s ease-out both; }
  .sf input::placeholder { color: rgba(229,189,193,.5); }
  .sf input:focus { outline: none; }
  .sf ::-webkit-scrollbar { display: none; }

  @media (max-width: 768px) {
    .sf .row { flex-direction: column; align-items: stretch !important; }
    .sf .song-actions { flex-wrap: wrap; justify-content: center; }
    .sf .song-info { text-align: center; }
    .sf .song-thumb-wrap { justify-content: center; align-self: center; }
  }
  @media (prefers-reduced-motion: reduce) {
    .sf *, .sf *::before, .sf *::after { animation: none !important; transition: none !important; }
  }
`

const decode = (s) => { const t = document.createElement('textarea'); t.innerHTML = s; return t.value }
const watchUrl = (id) => `https://www.youtube.com/watch?v=${id}`

/* ================= SMALL UI PIECES ================= */
const Icon = ({ name, size = 18, color, spin }) => (
  <span className={`ms ${spin ? 'spin' : ''}`} style={{ fontSize: size, color }}>{name}</span>
)

const RoundBtn = ({ icon, title, onClick, disabled, color = C.textVar, active, spin }) => (
  <button
    title={title}
    aria-label={title}
    onClick={onClick}
    disabled={disabled}
    style={{
      width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
      background: active ? 'rgba(111,242,255,.18)' : C.high,
      color: active ? C.cyan : color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
  >
    <Icon name={icon} size={18} spin={spin} />
  </button>
)

/* ================= APP ================= */
function App() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [current, setCurrent] = useState(null)
  const [autoplay, setAutoplay] = useState(false)
  const [searching, setSearching] = useState(false)
  const [status, setStatus] = useState({ text: 'Ready to play! Search your favourite song', kind: 'info' })
  const [copiedId, setCopiedId] = useState('')
  const [downloading, setDownloading] = useState('')
  const playerRef = useRef(null)

  useEffect(() => {
    const links = [
      'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap',
      'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap',
    ].map((href) => {
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l); return l
    })
    return () => links.forEach((l) => l.remove())
  }, [])

  /* ---------- SEARCH ---------- */
  const searchSongs = async (q = query) => {
    const text = q.trim()
    if (!text) return setStatus({ text: 'Please enter a song name!', kind: 'error' })
    if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === 'PASTE_YOUR_NEW_KEY_HERE') return setStatus({ text: 'Missing YouTube API Key in App.jsx', kind: 'error' })

    setSearching(true)
    setStatus({ text: `Searching neural audio streams for "${text}"...`, kind: 'loading' })
    try {
      const url = new URL('https://www.googleapis.com/youtube/v3/search')
      url.search = new URLSearchParams({ part: 'snippet', type: 'video', maxResults: '12', q: text + ' official song', videoEmbeddable: 'true', key: YOUTUBE_API_KEY })
      const res = await fetch(url)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'YouTube search failed.')
      if (!data.items?.length) { setResults([]); return setStatus({ text: 'No songs found! Try another title or artist.', kind: 'info' }) }

      setResults(data.items.map((v) => ({
        id: v.id.videoId,
        title: decode(v.snippet.title),
        channel: decode(v.snippet.channelTitle || 'Official Audio Stream'),
        thumb: v.snippet.thumbnails?.medium?.url || v.snippet.thumbnails?.default?.url || '',
      })))
      setStatus({ text: `🎶 Found ${data.items.length} audio streams for "${text}":`, kind: 'found' })
    } catch (err) {
      setStatus({ text: 'Error: ' + err.message, kind: 'error' })
    } finally {
      setSearching(false)
    }
  }

  /* ---------- PLAY ---------- */
  const playTrack = (track) => {
    setCurrent(track); setAutoplay(true); setStatus({ text: `Selected: ${track.title}`, kind: 'selected' })
    if (window.innerWidth < 1024) playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  /* ---------- COPY LINK ---------- */
  const copyLink = async (track) => {
    if (!track) return
    const link = watchUrl(track.id)
    try { await navigator.clipboard.writeText(link) } catch {
      const ta = document.createElement('textarea'); ta.value = link; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove()
    }
    setCopiedId(track.id); setTimeout(() => setCopiedId((c) => (c === track.id ? '' : c)), 2000)
  }

  /* ---------- DOWNLOAD ---------- */
  const download = async (track, format) => {
    if (!track) return
    const key = `${track.id}:${format}`; setDownloading(key); setStatus({ text: `Processing "${track.title}" (${format.toUpperCase()})... please wait.`, kind: 'loading' })
    try {
      const res = await fetch(`${API_URL}/download?url=${encodeURIComponent(watchUrl(track.id))}&format=${format}`)
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Server error') }
      const blob = await res.blob(); const href = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.href = href; a.download = `${track.title.replace(/[\\/:*?"<>|]/g, '')}.${format}`; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(href)
      setStatus({ text: 'Download complete!', kind: 'selected' })
    } catch (err) {
      setStatus({ text: 'Error: ' + err.message, kind: 'error' })
    } finally {
      setDownloading('')
    }
  }

  const statusColor = { info: C.textVar, error: C.error, loading: C.cyan, found: C.primary, selected: C.cyan }[status.kind]
  const isDl = (t, f) => downloading === `${t?.id}:${f}`

  /* ================= RENDER ================= */
  return (
    <div className="sf">
      <style>{css}</style>

      {/* HEADER */}
      <header style={{ position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 50, height: 70, background: 'rgba(7,7,13,.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: gradBtn, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(255,78,123,.6)' }}>
            <Icon name="graphic_eq" size={22} color="#fff" />
          </div>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Song Finder</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>Dhinesh</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: C.cyan }}>Creator</div>
          </div>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg, ${C.pc}, ${C.cyan})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: C.lowest }}>D</div>
        </div>
      </header>

      <main style={{ paddingTop: 70, flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div className="aurora">
          <div className="grid-bg" />
          <div className="blob a" /><div className="blob b" /><div className="blob c" />
        </div>

        {/* HERO + SEARCH */}
        <section className="hero-in" style={{ position: 'relative', zIndex: 1, padding: '3.5rem 1rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 18px', borderRadius: 999, background: 'rgba(35,35,49,.7)', border: '1px solid rgba(255,78,123,.35)', boxShadow: '0 0 22px rgba(255,78,123,.25)', marginBottom: 22 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.pc, boxShadow: '0 0 10px rgba(255,78,123,1)' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: C.primary }}>🎵 Ultimate Music Experience</span>
          </div>

          <h1 className="hero-h">
            Discover, stream &amp; enjoy your <span className="shine">favorite tracks</span>
          </h1>
          <p style={{ fontSize: 16, color: C.textVar, maxWidth: 620, margin: '18px 0 34px' }}>Stream ultra high-definition soundwaves directly via Dhinesh's neural audio discovery engine.</p>

          {/* Search Bar */}
          <div style={{ width: '100%', maxWidth: 800, position: 'relative' }}>
            <div className="search-glow" />
            <div className="row" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6, padding: 8, borderRadius: 22, background: 'rgba(7,7,13,.92)', backdropFilter: 'blur(24px)', boxShadow: '0 14px 44px rgba(0,0,0,.75)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, paddingLeft: 16 }}>
                <Icon name="graphic_eq" size={24} color={C.cyan} />
                <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && searchSongs()} autoComplete="off" placeholder="Search by song name, artist, or movie..." aria-label="Search songs" style={{ width: '100%', padding: '14px 0', background: 'transparent', border: 'none', fontSize: 16, color: C.text, fontFamily: 'inherit' }} />
              </div>
              <button onClick={() => searchSongs()} disabled={searching} style={{ padding: '14px 26px', borderRadius: 16, background: gradBtn, color: '#fff', fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 6px 24px rgba(255,78,123,.55)' }}>
                <span>{searching ? 'Searching...' : 'Search'}</span>
                <Icon name={searching ? 'sync' : 'search'} size={18} spin={searching} />
              </button>
            </div>
          </div>

          {/* Tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20, maxWidth: 800 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(229,189,193,.7)', marginRight: 4 }}>Trending:</span>
            {TAGS.map((t) => (<button key={t} className="chip" onClick={() => { setQuery(t); searchSongs(t) }} style={{ padding: '8px 16px', borderRadius: 999, background: 'rgba(35,35,49,.7)', border: '1px solid rgba(255,255,255,.08)', color: C.textVar, fontSize: 12, fontWeight: 700 }}>{t}</button>))}
          </div>

          {/* Status */}
          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 8 }} aria-live="polite">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.cyan, boxShadow: '0 0 8px rgba(111,242,255,.9)' }} />
            <p style={{ fontSize: 13, fontWeight: 600, color: statusColor }}>{status.text}</p>
          </div>
        </section>

        {/* DASHBOARD */}
        <section className="grid" style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto', padding: '1rem 1.5rem', alignItems: 'start' }}>

          {/* LEFT: Results */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name="queue_music" size={26} color={C.pc} />
              <h2 style={{ fontSize: 22, fontWeight: 800 }}>Audio Stream Queue</h2>
              {results.length > 0 && <span style={{ padding: '2px 10px', borderRadius: 999, background: 'rgba(255,78,123,.18)', color: C.primary, fontSize: 12, fontWeight: 700 }}>{results.length}</span>}
            </div>

            {results.length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center', background: 'rgba(35,35,49,.3)', borderRadius: 20, border: '1px dashed rgba(255,78,123,.35)' }}>
                <Icon name="search_off" size={52} color={C.textVar} />
                <p style={{ marginTop: 16, fontSize: 17, fontWeight: 700, color: C.textVar }}>No songs loaded yet</p>
                <p style={{ fontSize: 14, color: C.text, marginTop: 8 }}>Use the search bar above to find your favorite tracks via the YouTube API.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {results.map((t, i) => (
                  <div key={t.id} className={`song row ${current?.id === t.id ? 'on' : ''}`} style={{ padding: 12, borderRadius: 18, background: 'rgba(35,35,49,.5)', backdropFilter: 'blur(20px)', boxShadow: '0 10px 15px rgba(0,0,0,.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, borderColor: current?.id === t.id ? C.pc : undefined }}>
                    <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0, flex: 1 }}>
                      <div className="song-thumb-wrap" style={{ position: 'relative', width: 72, height: 72, borderRadius: 14, overflow: 'hidden', flexShrink: 0, background: C.high, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={t.thumb || `https://i.ytimg.com/vi/${t.id}/mqdefault.jpg`} alt={t.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(7,7,13,.85), transparent)', display: 'flex', alignItems: 'flex-end', padding: 5 }}>
                          <span style={{ fontSize: 11, color: C.cyan, fontFamily: 'monospace', fontWeight: 700 }}>#{i + 1}</span>
                        </div>
                      </div>
                      <div className="song-info" style={{ minWidth: 0 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</h3>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: C.textVar, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.channel}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                          <span style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(111,242,255,.1)', border: '1px solid rgba(111,242,255,.25)', color: C.cyan, fontSize: 10, fontWeight: 700 }}>HQ stream</span>
                          {current?.id === t.id && <span style={{ fontSize: 11, fontWeight: 700, color: C.pc }}>● Now playing</span>}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="song-actions" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <button onClick={() => playTrack(t)} style={{ padding: '10px 18px', borderRadius: 999, background: gradBtn, color: '#fff', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 18px rgba(255,78,123,.45)' }}>
                        <span>Play</span><Icon name="play_arrow" size={16} />
                      </button>
                      <RoundBtn icon={copiedId === t.id ? 'check' : 'link'} title="Copy link" active={copiedId === t.id} onClick={() => copyLink(t)} />
                      <RoundBtn icon={isDl(t, 'mp3') ? 'sync' : 'audio_file'} spin={isDl(t, 'mp3')} title="Download MP3" disabled={!!downloading} onClick={() => download(t, 'mp3')} color={C.cyan} />
                      <RoundBtn icon={isDl(t, 'mp4') ? 'sync' : 'download'} spin={isDl(t, 'mp4')} title="Download MP4" disabled={!!downloading} onClick={() => download(t, 'mp4')} color={C.primary} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Studio Player */}
          <div ref={playerRef} className="sticky" style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
            <div className="player-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: C.pc, boxShadow: '0 0 10px rgba(255,78,123,.9)' }} />
                  <h2 style={{ fontSize: 18, fontWeight: 800 }}>Studio Player</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 22, padding: '3px 10px', borderRadius: 999, background: 'rgba(7,7,13,.85)' }}>
                  {[C.cyan, C.pc, C.cyan, C.primary, C.cyan, C.pc, C.cyan].map((c, i) => (<span key={i} className="bar" style={{ background: c, animationDelay: `${i * 0.12}s` }} />))}
                </div>
              </div>

              {/* Player Screen */}
              <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', borderRadius: 18, overflow: 'hidden', background: C.lowest, boxShadow: current ? '0 0 40px rgba(255,78,123,.3)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {current ? (
                  <iframe key={current.id + autoplay} src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(current.id)}?autoplay=${autoplay ? 1 : 0}`} title="YouTube music player" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen style={{ width: '100%', height: '100%', border: 'none' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: C.textVar }}>
                    <Icon name="music_off" size={52} color={C.highest} />
                    <p style={{ marginTop: 12, fontSize: 14, fontWeight: 600 }}>Select a song to play</p>
                  </div>
                )}
              </div>

              {/* Now Playing Controls */}
              <div style={{ padding: 12, borderRadius: 16, background: 'rgba(7,7,13,.65)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <div className={`vinyl ${current ? '' : 'paused'}`}>
                    {current?.thumb ? <img src={current.thumb} alt="" /> : <Icon name="music_note" size={14} color={C.pc} />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.cyan }}>Now playing</span>
                    <p style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{current ? current.title : 'No track selected'}</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <button onClick={() => copyLink(current)} disabled={!current} style={{ padding: '12px 8px', borderRadius: 14, background: copiedId === current?.id ? 'rgba(111,242,255,.18)' : C.high, color: copiedId === current?.id ? C.cyan : C.text, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Icon name={copiedId === current?.id ? 'check' : 'link'} size={16} />
                    {copiedId === current?.id ? 'Copied!' : 'Copy'}
                  </button>
                  <button onClick={() => download(current, 'mp3')} disabled={!current || !!downloading} style={{ padding: '12px 8px', borderRadius: 14, background: C.high, color: C.cyan, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Icon name={isDl(current, 'mp3') ? 'sync' : 'audio_file'} size={16} spin={isDl(current, 'mp3')} /> MP3
                  </button>
                  <button onClick={() => download(current, 'mp4')} disabled={!current || !!downloading} style={{ padding: '12px 8px', borderRadius: 14, background: C.high, color: C.primary, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Icon name={isDl(current, 'mp4') ? 'sync' : 'download'} size={16} spin={isDl(current, 'mp4')} /> MP4
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer style={{ marginTop: 40, background: 'rgba(7,7,13,.9)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,.06)', padding: '1.5rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00d8e7', boxShadow: '0 0 8px rgba(0,216,231,.8)' }} />
          <span style={{ fontSize: 12, color: C.textVar }}>Song Finder Engine © {new Date().getFullYear()}. Next-Gen Audio Discovery Platform.</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.low, padding: '6px 18px', borderRadius: 999, boxShadow: '0 0 20px rgba(111,242,255,.1)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: C.textVar }}>Architected &amp;</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.cyan }}>Developed by Dhinesh</span>
          <Icon name="electric_bolt" size={16} color={C.pc} />
        </div>
      </footer>
    </div>
  )
}
export default App
