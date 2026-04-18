const rawApiBase = import.meta.env.VITE_API_URL || import.meta.env.VIITE_API_URL || 'https://oracle-back.onrender.com'

const API_BASE = rawApiBase.replace(/\/+$/, '')

export default API_BASE
