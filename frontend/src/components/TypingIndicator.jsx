export default function TypingIndicator() {
  return (
    <div className="flex justify-start mb-2">
      <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm
        px-4 py-2.5 shadow-sm flex gap-1 items-center">
        {[0, 0.2, 0.4].map((delay, i) => (
          <span key={i}
            className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
      </div>
    </div>
  )
}