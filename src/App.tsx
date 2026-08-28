import { useEffect, useState } from 'react'
import { clearToken, isAuthed } from './auth'
import LoginPage from './pages/LoginPage'
import FeedbackListPage from './pages/FeedbackListPage'

export default function App() {
  const [authed, setAuthed] = useState<boolean>(isAuthed())

  useEffect(() => {
    const onExpired = () => setAuthed(false)
    window.addEventListener('auth-expired', onExpired)
    return () => window.removeEventListener('auth-expired', onExpired)
  }, [])

  if (!authed) {
    return <LoginPage onSuccess={() => setAuthed(true)} />
  }

  return (
    <FeedbackListPage
      onLogout={() => {
        clearToken()
        setAuthed(false)
      }}
    />
  )
}
