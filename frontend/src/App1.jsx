import { useState } from 'react'

function App() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  const API_URL = 'http://localhost:8000'

  const handleDownload = async (format) => {
    if (!url.trim()) {
      setError('Please paste a valid URL')
      return
    }
    
    setLoading(true)
    setError('')
    setStatus('Processing... Please wait.')

    try {
      const response = await fetch(
        `${API_URL}/download?url=${encodeURIComponent(url)}&format=${format}`
      )

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.detail || 'Server error')
      }

      setStatus('Downloading file...')
      
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      
      const ext = format.includes('mp3') || format === 'ig_audio' ? 'mp3' : 'mp4'
      link.download = `media_${Date.now()}.${ext}`
      
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)
      
      setStatus('Download complete!')
      setTimeout(() => setStatus(''), 3000)

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{maxWidth: '500px', margin: '50px auto', textAlign: 'center', fontFamily: 'Arial', padding: '20px'}}>
      <h1>🎵 Media Downloader</h1>
      <p style={{color: '#666'}}>YouTube & Instagram Reels</p>
      
      <input 
        type="text" 
        placeholder="Paste YouTube or Instagram URL here..." 
        value={url} 
        onChange={(e) => setUrl(e.target.value)} 
        disabled={loading}
        style={{width: '100%', padding: '14px', fontSize: '1rem', border: '2px solid #e0e0e0', borderRadius: '8px', marginBottom: '20px', boxSizing: 'border-box'}}
      />
      
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
        <button onClick={() => handleDownload('mp4')} disabled={loading} style={{padding: '12px', fontSize: '0.95rem', fontWeight: '600', border: 'none', borderRadius: '8px', cursor: 'pointer', background: '#ff0000', color: 'white'}}>▶️ YT Video (MP4)</button>
        <button onClick={() => handleDownload('mp3')} disabled={loading} style={{padding: '12px', fontSize: '0.95rem', fontWeight: '600', border: 'none', borderRadius: '8px', cursor: 'pointer', background: '#ff0000', color: 'white'}}>🎵 YT Audio (MP3)</button>
        <button onClick={() => handleDownload('ig_video')} disabled={loading} style={{padding: '12px', fontSize: '0.95rem', fontWeight: '600', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'linear-gradient(45deg, #f09433, #dc2743, #bc1888)', color: 'white'}}>📸 IG Reel Video</button>
        <button onClick={() => handleDownload('ig_audio')} disabled={loading} style={{padding: '12px', fontSize: '0.95rem', fontWeight: '600', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'linear-gradient(45deg, #f09433, #dc2743, #bc1888)', color: 'white'}}>🎧 IG Reel Audio</button>
      </div>

      {loading && <p style={{color: '#0056b3', marginTop: '20px'}}>⏳ {status}</p>}
      {status && !loading && <p style={{color: '#0f5132', marginTop: '20px'}}>✅ {status}</p>}
      {error && <p style={{color: '#842029', marginTop: '20px'}}>❌ {error}</p>}
    </div>
  )
}

export default App