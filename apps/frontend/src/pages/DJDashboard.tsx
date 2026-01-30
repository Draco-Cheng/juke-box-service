export default function DJDashboard() {
  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">DJ Dashboard</h1>
          <button className="bg-green-600 px-4 py-2 rounded-lg font-semibold">
            Start Session
          </button>
        </div>

        {/* TODO: Request queue */}
        <div className="bg-gray-900 rounded-lg p-6">
          <p className="text-gray-500 text-center">No active session</p>
        </div>
      </div>
    </div>
  )
}
