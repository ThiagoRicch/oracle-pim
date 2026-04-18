const rawApiBase = import.meta.env.VITE_API_URL || import.meta.env.VIITE_API_URL || 'http://127.0.0.1:8000'

const API_BASE = rawApiBase.replace(/\/+$/, '')

export default API_BASE
