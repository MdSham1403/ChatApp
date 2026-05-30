import useAuthStore from '../store/authStore'

export default function ChatPlaceholder() {
  const { user, logout } = useAuthStore()
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-lg font-medium text-gray-800">
          Welcome, {user?.display_name || user?.username} 👋
        </p>
        <p className="text-sm text-gray-500 mt-1">Chat UI coming in Phase 2</p>
        <button onClick={logout}
          className="mt-4 text-sm text-red-500 hover:underline">
          Sign out
        </button>
      </div>
    </div>
  )
}