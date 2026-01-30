import { useParams } from 'react-router-dom'

export default function JoinPage() {
  const { venueSlug } = useParams()

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-2">Welcome!</h1>
        <p className="text-gray-600 mb-6">Venue: {venueSlug}</p>

        {/* TODO: Song search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search for a song..."
            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        {/* TODO: Request queue */}
        <div className="bg-gray-100 rounded-lg p-4">
          <p className="text-gray-500 text-center">No active session</p>
        </div>
      </div>
    </div>
  )
}
