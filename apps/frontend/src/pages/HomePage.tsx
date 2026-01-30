export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">DJ Request</h1>
        <p className="text-gray-400 mb-8">Pay to request songs from DJs</p>
        <a
          href="/dj"
          className="bg-white text-black px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition"
        >
          DJ Login
        </a>
      </div>
    </div>
  )
}
