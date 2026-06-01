import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import useAuthStore from '../store/authStore'

export default function Register() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [form, setForm] = useState({
    email: '', username: '', password: '', display_name: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Safely truncate strings to 72 bytes max for bcrypt boundary logic
  const truncateTo72Bytes = (str) => {
    const encoder = new TextEncoder()
    const decoder = new TextDecoder('utf-8')
    const bytes = encoder.encode(str)
    
    if (bytes.length <= 72) return str
    
    const truncatedBytes = bytes.slice(0, 72)
    return decoder.decode(truncatedBytes).replace(/\uFFFD$/, '')
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ 
      ...f, 
      [name]: name === 'password' ? truncateTo72Bytes(value) : value 
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    // Construct robust registration payload targeting both potential schema patterns
    const payload = {
      email: form.email.trim(),
      username: form.username.trim().toLowerCase(),
      password: form.password,
      display_name: form.display_name.trim() || form.username.trim(), 
      displayName: form.display_name.trim() || form.username.trim()
    }

    try {
      const { data } = await api.post('/auth/register', payload)
      setAuth(data.user, data.access_token, data.refresh_token)
      navigate('/chat')
    } catch (err) {
      const backendDetail = err.response?.data?.detail
      
      if (Array.isArray(backendDetail)) {
        // Parse structural Pydantic validation arrays into clear, readable feedback strings
        const parsedErrors = backendDetail
          .map((errObj) => `${errObj.loc.slice(1).join(' -> ')}: ${errObj.msg}`)
          .join(' | ')
        setError(parsedErrors)
      } else if (typeof backendDetail === 'string') {
        setError(backendDetail)
      } else if (err.response?.data?.message) {
        setError(err.response.data.message)
      } else {
        setError('Registration rejected (400 Bad Request). Please verify fields or check network tab logs.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-container">
      <div className="register-card">
        <h1 className="register-title">Create account</h1>
        <p className="register-subtitle">Start chatting in seconds</p>

        {error && (
          <div className="register-error-box">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-group">
            <label className="form-label">Display name</label>
            <input
              name="display_name" 
              value={form.display_name}
              onChange={handleChange} 
              placeholder="Your name"
              autoComplete="name"
              className="form-input"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              name="username" 
              value={form.username}
              onChange={handleChange} 
              required 
              placeholder="e.g. johndoe"
              autoComplete="username"
              className="form-input"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email" 
              name="email" 
              value={form.email}
              onChange={handleChange} 
              required 
              placeholder="you@email.com"
              autoComplete="email"
              className="form-input"
            />
          </div>
          
          <div className="form-group">
            <div className="password-label-row">
              <label className="form-label">Password</label>
              <span className="byte-warning">Max 72 bytes limit</span>
            </div>
            <input
              type="password" 
              name="password" 
              value={form.password}
              onChange={handleChange} 
              required 
              placeholder="Min 8 characters"
              autoComplete="new-password"
              className="form-input"
            />
          </div>
          
          <button
            type="submit" 
            disabled={loading}
            className="submit-button"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="redirect-footer">
          Already have an account?{' '}
          <Link to="/login" className="redirect-link">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}