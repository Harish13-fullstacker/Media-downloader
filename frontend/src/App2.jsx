import { useState, useEffect, useRef } from 'react'

/* ================= CONFIG ================= */
// 1. PASTE YOUR YOUTUBE API KEY HERE (no .env needed)
const YOUTUBE_API_KEY = 'AIzaSyCdDGCAF05RyJ8C9QY4kzZSej3xgWzVIs4'

// 2. YOUR PYTHON BACKEND URL
const API_URL = 'http://localhost:8000'

const TAGS = ['Tamil Hits', 'Anirudh Musical', 'A.R. Rahman', 'Lo-Fi Chill', 'EDM Party']

/* ================= THEME ================= */
const C = {
  bg: '#12121d', lowest: '#0d0d17', low: '#1b1b25', high: '#292934', highest: '#34343f',
  text: '#e4e1f0', textVar: '#e5bdc1', primary: '#ffb2bd', pc: '#ff4e7b', pink: '#ff2a6d', cyan: '#6ff2ff', error: '#ffb4ab',
}
const gradBtn = `linear-gradient(90deg, ${C.pc}, ${C.pink})`

const css = `
  .sf * { box-sizing: border-box; }
  .sf { font-family: 'Plus Jakarta Sans', sans-serif; background: ${C.bg}; color: ${C.text}; min-height: 100vh; display: flex; flex-direction: column; }
  .sf .ms { font-family: 'Material Symbols Outlined'; font-weight: normal; font-style: normal; line-height: 1; display: inline-block; letter-spacing: normal; text-transform: none; white-space: nowrap; -webkit-font-smoothing: antialiased; }
  .sf button { font-family: inherit; cursor: pointer; border: none; transition: all .2s; }
  .sf button:hover:not(:disabled) { filter: brightness(1.12); }
  .sf button:active:not(:disabled) { transform: scale(.96); }
  .sf button:disabled { opacity: .6; cursor: not-allowed; }
  .sf .song { transition: all .25s; }
  .sf .song:hover { background: rgba(41,41,52,.85) !important; box-shadow: 0 8px 30px rgba(255,78,123,.18) !important; }
  .sf .chip:hover { background: ${C.highest} !important; color: ${C.cyan} !important; }
  .sf .grid { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
  @media (min-width: 1024px) { .sf .grid { grid-template-columns: 7fr 5fr; } .sf .sticky { position: sticky; top: 96px; } }
  @media (max-width: 768px) {
    .sf .row { flex-direction: column; align-items: stretch !important; }
    .sf .hero-h { font-size: 32px !important; line-height: 40px !important; }
    .sf .song-actions { flex-wrap: wrap; justify-content: center; }
    .sf .song-info { text-align: center; }
    .sf .song-thumb-wrap { justify-content: center; }
  }
  @keyframes sfSpin { to { transform: rotate(360deg); } }
  @keyframes sfBar { 0%,100% { transform: scaleY(.4); } 50% { transform: scaleY(1); } }
  .sf .spin { animation: sfSpin 1s linear infinite; }
  .sf .bar { width: 4px; border-radius: 4px; height: 100%; transform-origin: bottom; animation: sfBar 1s ease-in-out infinite; }
  .sf input::placeholder { color: rgba(229,189,193,.5); }
  .sf input:focus { outline: none; }
  .sf ::-webkit-scrollbar { display: none; }
`

const decode = (s) => { const t = document.createElement('textarea'); t.innerHTML = s; return t.value }
const watchUrl = (id) => `https://www.youtube.com/watch?v=${id}`

/* ================= SMALL UI PIECES ================= */
const Icon = ({ name, size = 18, color, spin }) => (
  <span className={`ms ${spin ? 'spin' : ''}`} style={{ fontSize: size, color }}>{name}</span>
)

const RoundBtn = ({ icon, title, onClick, disabled, color = C.textVar, active }) => (
  <button
    title={title}
    onClick={onClick}
    disabled={disabled}
    style={{
      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
      background: active ? 'rgba(111,242,255,.18)' : C.high,
      color: active ? C.cyan : color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
  >
    <Icon name={icon} size={18} />
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
    if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === 'YOUR_YOUTUBE_API_KEY_HERE') return setStatus({ text: 'Missing YouTube API Key in App.jsx', kind: 'error' })

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
    if (!track) return;
    const link = watchUrl(track.id)
    try { await navigator.clipboard.writeText(link) } catch {
      const ta = document.createElement('textarea'); ta.value = link; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove()
    }
    setCopiedId(track.id); setTimeout(() => setCopiedId((c) => (c === track.id ? '' : c)), 2000)
  }

  /* ---------- DOWNLOAD ---------- */
  const download = async (track, format) => {
    if (!track) return;
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
      <header style={{ position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 50, height: 70, background: 'rgba(13,13,23,.9)', backdropFilter: 'blur(20px)', boxShadow: '0 1px 12px rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="graphic_eq" size={24} color={C.cyan} />
          <span style={{ fontSize: 18, fontWeight: 700 }}>Song Finder</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, fontWeight: 600 }}>Dhinesh</div>
          <div style={{ fontSize: 9, fontWeight: 700, color: C.cyan, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Creator</div>
        </div>
      </header>

      <main style={{ paddingTop: 70, flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -128, left: -128, width: 384, height: 384, borderRadius: '50%', background: 'rgba(255,78,123,.15)', filter: 'blur(120px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '25%', right: -96, width: 480, height: 480, borderRadius: '50%', background: 'rgba(0,216,231,.1)', filter: 'blur(140px)', pointerEvents: 'none' }} />

        {/* HERO + SEARCH */}
        <section style={{ position: 'relative', zIndex: 1, padding: '2rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 999, background: 'rgba(41,41,52,.7)', boxShadow: '0 0 16px rgba(255,78,123,.2)', marginBottom: 16 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.pc, boxShadow: '0 0 8px rgba(255,78,123,.9)' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: C.primary, textTransform: 'uppercase', letterSpacing: '0.1em' }}>🎵 Ultimate Music Experience</span>
          </div>
          <h1 className="hero-h" style={{ fontSize: 48, lineHeight: '56px', fontWeight: 800, letterSpacing: '-0.03em', maxWidth: 880, margin: 0 }}>
            Discover, Stream &amp; Enjoy Your{' '}
            <span style={{ background: `linear-gradient(90deg, ${C.primary}, ${C.pc}, ${C.cyan})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>Favorite Tracks</span>
          </h1>
          <p style={{ fontSize: 15, color: C.textVar, maxWidth: 640, margin: '12px 0 24px' }}>Stream ultra high-definition soundwaves directly via Dhinesh's neural audio discovery engine.</p>

          {/* Search Bar */}
          <div style={{ width: '100%', maxWidth: 768, position: 'relative' }}>
            <div style={{ position: 'absolute', inset: -4, borderRadius: 20, background: `linear-gradient(90deg, rgba(255,78,123,.4), rgba(111,242,255,.3), rgba(255,178,189,.4))`, filter: 'blur(16px)', opacity: 0.5 }} />
            <div className="row" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 4, padding: 8, borderRadius: 20, background: 'rgba(13,13,23,.85)', backdropFilter: 'blur(24px)', boxShadow: '0 12px 40px rgba(0,0,0,.7)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, paddingLeft: 16 }}>
                <Icon name="graphic_eq" size={22} color={C.cyan} />
                <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && searchSongs()} autoComplete="off" placeholder="Search by song name, artist, or movie..." style={{ width: '100%', padding: '12px 0', background: 'transparent', border: 'none', fontSize: 15, color: C.text, fontFamily: 'inherit' }} />
              </div>
              <button onClick={() => searchSongs()} disabled={searching} style={{ padding: '12px 20px', borderRadius: 14, background: gradBtn, color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 4px 20px rgba(255,78,123,.45)' }}>
                <span>{searching ? 'Searching...' : 'Search'}</span>
                <Icon name={searching ? 'sync' : 'search'} size={16} spin={searching} />
              </button>
            </div>
          </div>

          {/* Tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, maxWidth: 768 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(229,189,193,.7)', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 4 }}>Trending:</span>
            {TAGS.map((t) => (<button key={t} className="chip" onClick={() => { setQuery(t); searchSongs(t) }} style={{ padding: '6px 14px', borderRadius: 999, background: 'rgba(41,41,52,.6)', color: C.textVar, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em' }}>{t}</button>))}
          </div>

          {/* Status */}
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.cyan, boxShadow: '0 0 6px rgba(111,242,255,.8)' }} />
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, letterSpacing: '0.02em', color: statusColor }}>{status.text}</p>
          </div>
        </section>

        {/* DASHBOARD */}
        <section className="grid" style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto', padding: '1rem 1.5rem', alignItems: 'start' }}>

          {/* LEFT: Results */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="queue_music" size={22} color={C.pc} />
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Audio Stream Queue</h2>
              </div>
            </div>

            {results.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', background: 'rgba(41,41,52,.2)', borderRadius: 16, border: '1px dashed rgba(255,78,123,.3)' }}>
                <Icon name="search_off" size={48} color={C.textVar} />
                <p style={{ marginTop: 16, fontSize: 16, fontWeight: 600, color: C.textVar }}>No songs loaded yet</p>
                <p style={{ fontSize: 13, color: C.text, marginTop: 8 }}>Use the search bar above to find your favorite tracks via the YouTube API.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {results.map((t, i) => (
                  <div key={t.id} className="song row" style={{ padding: 12, borderRadius: 16, background: 'rgba(41,41,52,.4)', backdropFilter: 'blur(20px)', boxShadow: '0 10px 15px rgba(0,0,0,.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, outline: current?.id === t.id ? `1px solid ${C.pc}` : 'none' }}>
                    <div className="row" style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0, flex: 1 }}>
                      <div className="song-thumb-wrap" style={{ position: 'relative', width: 64, height: 64, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: C.high, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={t.thumb || `https://i.ytimg.com/vi/${t.id}/mqdefault.jpg`} alt={t.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(13,13,23,.8), transparent)', display: 'flex', alignItems: 'flex-end', padding: 4 }}>
                          <span style={{ fontSize: 10, color: C.cyan, fontFamily: 'monospace' }}>#{i + 1}</span>
                        </div>
                      </div>
                      <div className="song-info" style={{ minWidth: 0 }}>
                        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</h3>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: C.textVar, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.channel}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <span style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(13,13,23,.7)', color: C.cyan, fontSize: 10, fontWeight: 700, fontFamily: 'monospace' }}>STREAM HQ</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="song-actions" style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => playTrack(t)} style={{ padding: '8px 14px', borderRadius: 999, background: gradBtn, color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 16px rgba(255,78,123,.4)' }}>
                        <span>Play</span><Icon name="play_arrow" size={14} />
                      </button>
                      <RoundBtn icon={copiedId === t.id ? 'check' : 'link'} title="Copy link" active={copiedId === t.id} onClick={() => copyLink(t)} />
                      <RoundBtn icon={isDl(t, 'mp3') ? 'sync' : 'audio_file'} title="Download MP3" disabled={!!downloading} onClick={() => download(t, 'mp3')} color={C.cyan} />
                      <RoundBtn icon={isDl(t, 'mp4') ? 'sync' : 'download'} title="Download MP4" disabled={!!downloading} onClick={() => download(t, 'mp4')} color={C.primary} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Studio Player */}
          <div ref={playerRef} className="sticky" style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
            <div style={{ borderRadius: 24, background: 'rgba(41,41,52,.6)', backdropFilter: 'blur(24px)', padding: 16, boxShadow: '0 20px 50px rgba(0,0,0,.6)', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: C.pc, boxShadow: '0 0 8px rgba(255,78,123,.8)' }} />
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Studio Player</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 20, padding: '2px 8px', borderRadius: 999, background: 'rgba(13,13,23,.8)' }}>
                  {[C.cyan, C.pc, C.cyan, C.primary, C.cyan].map((c, i) => (<span key={i} className="bar" style={{ background: c, animationDelay: `${i * 0.15}s` }} />))}
                </div>
              </div>

              {/* Player Screen */}
              <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', borderRadius: 16, overflow: 'hidden', background: C.lowest, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {current ? (
                  <iframe key={current.id + autoplay} src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(current.id)}?autoplay=${autoplay ? 1 : 0}`} title="YouTube music player" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen style={{ width: '100%', height: '100%', border: 'none' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: C.textVar }}>
                    <Icon name="music_off" size={48} color={C.high} />
                    <p style={{ marginTop: 12, fontSize: 14, fontWeight: 600 }}>Select a song to play</p>
                  </div>
                )}
              </div>

              {/* Now Playing Controls */}
              <div style={{ padding: 8, borderRadius: 12, background: 'rgba(13,13,23,.6)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,78,123,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name="music_note" size={20} color={C.pc} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 10, fontWeight: 700, color: C.cyan, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Now Playing</span>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{current ? current.title : 'No track selected'}</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <button onClick={() => copyLink(current)} disabled={!current} style={{ padding: '10px 8px', borderRadius: 12, background: copiedId === current?.id ? 'rgba(111,242,255,.18)' : C.high, color: copiedId === current?.id ? C.cyan : C.text, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Icon name={copiedId === current?.id ? 'check' : 'link'} size={16} />
                    {copiedId === current?.id ? 'Copied!' : 'Copy'}
                  </button>
                  <button onClick={() => download(current, 'mp3')} disabled={!current || !!downloading} style={{ padding: '10px 8px', borderRadius: 12, background: C.high, color: C.cyan, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Icon name={isDl(current, 'mp3') ? 'sync' : 'audio_file'} size={16} spin={isDl(current, 'mp3')} /> MP3
                  </button>
                  <button onClick={() => download(current, 'mp4')} disabled={!current || !!downloading} style={{ padding: '10px 8px', borderRadius: 12, background: C.high, color: C.primary, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Icon name={isDl(current, 'mp4') ? 'sync' : 'download'} size={16} spin={isDl(current, 'mp4')} /> MP4
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer style={{ marginTop: 40, background: 'rgba(13,13,23,.9)', backdropFilter: 'blur(20px)', boxShadow: '0 -1px 16px rgba(0,0,0,.4)', padding: '1.5rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00d8e7', boxShadow: '0 0 8px rgba(0,216,231,.8)' }} />
          <span style={{ fontSize: 12, color: C.textVar }}>Song Finder Engine © 2024. Next-Gen Audio Discovery Platform.</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.low, padding: '4px 16px', borderRadius: 999, boxShadow: '0 0 20px rgba(111,242,255,.08)' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.textVar, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Architected &amp;</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.cyan }}>Developed by Dhinesh</span>
          <Icon name="electric_bolt" size={16} color={C.pc} />
        </div>
      </footer>
    </div>
  )
}
export default App