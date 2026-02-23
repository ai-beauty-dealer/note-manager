import { useState, useEffect } from 'react'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5005'
const API_KEY = import.meta.env.VITE_API_KEY || ''

function App() {
  const [articles, setArticles] = useState([])
  const [title, setTitle] = useState('')
  const [draftUrl, setDraftUrl] = useState('')
  const [publishAt, setPublishAt] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchArticles = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/articles`, {
        headers: {
          'x-api-key': API_KEY,
          'ngrok-skip-browser-warning': 'true'
        }
      })
      const data = await res.json()
      setArticles(data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
    } catch (err) {
      console.error('Failed to fetch articles', err)
    }
  }

  useEffect(() => {
    fetchArticles()
    const interval = setInterval(fetchArticles, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!draftUrl || !publishAt) return

    setLoading(true)
    try {
      await fetch(`${API_BASE_URL}/api/articles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ title, draft_url: draftUrl, publish_at: publishAt }),
      })
      setTitle('')
      setDraftUrl('')
      setPublishAt('')
      fetchArticles()
    } catch (err) {
      console.error('Failed to add article', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure?')) return
    try {
      await fetch(`${API_BASE_URL}/api/articles/${id}`, {
        method: 'DELETE',
        headers: {
          'x-api-key': API_KEY,
          'ngrok-skip-browser-warning': 'true'
        }
      })
      fetchArticles()
    } catch (err) {
      console.error('Failed to delete', err)
    }
  }

  const handlePostNow = async (id) => {
    try {
      await fetch(`${API_BASE_URL}/api/articles/${id}/post`, {
        method: 'POST',
        headers: {
          'x-api-key': API_KEY,
          'ngrok-skip-browser-warning': 'true'
        }
      })
      alert('Post triggered!')
      fetchArticles()
    } catch (err) {
      console.error('Failed to post', err)
    }
  }

  return (
    <div className="app-container">
      <header>
        <h1>Note Manager</h1>
        <div className="status-meta">{articles.length} Articles</div>
      </header>

      <form className="form-container" onSubmit={handleSubmit}>
        <div className="input-group">
          <label>記事タイトル (任意)</label>
          <input
            type="text"
            placeholder="タイトルを入力..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="input-group">
          <label>下書きURL (必須)</label>
          <input
            type="url"
            placeholder="https://note.com/notes/..."
            required
            value={draftUrl}
            onChange={(e) => setDraftUrl(e.target.value)}
          />
        </div>
        <div className="input-group">
          <label>投稿予約日時 (必須)</label>
          <input
            type="datetime-local"
            required
            value={publishAt}
            onChange={(e) => setPublishAt(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? '保存中...' : '予約リストに追加'}
        </button>
      </form>

      <div className="article-list">
        {articles.map((article) => (
          <div key={article.id} className="article-card">
            <div className="article-info">
              <div className="article-title">{article.title}</div>
              <div className="article-meta">
                <span className={`status-badge status-${article.status}`}>
                  {article.status === 'scheduled' ? '予約済み' : '投稿完了'}
                </span>
                <span>予定: {new Date(article.publish_at).toLocaleString('ja-JP')}</span>
                {article.published_url && (
                  <a href={article.published_url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-color)' }}>
                    記事を開く
                  </a>
                )}
              </div>
            </div>
            <div className="actions">
              {article.status === 'scheduled' && (
                <button className="btn btn-icon" onClick={() => handlePostNow(article.id)} title="今すぐ投稿">
                  🚀
                </button>
              )}
              <button className="btn btn-icon btn-danger" onClick={() => handleDelete(article.id)} title="削除">
                🗑️
              </button>
            </div>
          </div>
        ))}
        {articles.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-dim)' }}>記事がありません</div>}
      </div>
    </div>
  )
}

export default App
