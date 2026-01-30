import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { loadStripe, Stripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { api, Venue, Session, Request } from '../lib/api'

const TIER_PRICES = {
  normal: 200,
  priority: 500,
  asap: 1000,
}

// Payment Form Component
function PaymentForm({
  onSuccess,
  onCancel,
  paymentIntentId,
}: {
  onSuccess: () => void
  onCancel: () => void
  paymentIntentId: string
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setProcessing(true)
    setError(null)

    const { error: submitError } = await elements.submit()
    if (submitError) {
      setError(submitError.message || 'Payment failed')
      setProcessing(false)
      return
    }

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: 'if_required',
    })

    if (confirmError) {
      setError(confirmError.message || 'Payment failed')
      setProcessing(false)
      return
    }

    // Payment successful, confirm on backend
    try {
      await api.confirmPayment(paymentIntentId)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm payment')
    }
    setProcessing(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium"
          disabled={processing}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || processing}
          className="flex-1 py-3 bg-black text-white rounded-lg font-medium disabled:opacity-50"
        >
          {processing ? 'Processing...' : 'Pay Now'}
        </button>
      </div>
    </form>
  )
}

export default function JoinPage() {
  const { venueSlug } = useParams()
  const [venue, setVenue] = useState<Venue | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Stripe
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)
  const [showPayment, setShowPayment] = useState(false)

  // Form state
  const [songTitle, setSongTitle] = useState('')
  const [songArtist, setSongArtist] = useState('')
  const [tier, setTier] = useState<'normal' | 'priority' | 'asap'>('normal')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Load Stripe
  useEffect(() => {
    async function initStripe() {
      const config = await api.getStripeConfig()
      setStripePromise(loadStripe(config.publishable_key))
    }
    initStripe()
  }, [])

  useEffect(() => {
    if (!venueSlug) return

    async function loadData() {
      try {
        setLoading(true)
        const venueData = await api.getVenue(venueSlug)
        setVenue(venueData)

        const sessionData = await api.getActiveSession(venueSlug)
        setSession(sessionData)

        if (sessionData) {
          const requestsData = await api.getSessionRequests(sessionData.id)
          setRequests(requestsData)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [venueSlug])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!session || !songTitle.trim()) return

    setSubmitting(true)
    try {
      // Create PaymentIntent
      const { client_secret, payment_intent_id } = await api.createPaymentIntent({
        session_id: session.id,
        song_title: songTitle.trim(),
        song_artist: songArtist.trim() || undefined,
        tier,
        message: message.trim() || undefined,
        amount: TIER_PRICES[tier],
      })

      setClientSecret(client_secret)
      setPaymentIntentId(payment_intent_id)
      setShowPayment(true)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create payment')
    } finally {
      setSubmitting(false)
    }
  }

  function handlePaymentSuccess() {
    setShowPayment(false)
    setClientSecret(null)
    setPaymentIntentId(null)
    setSongTitle('')
    setSongArtist('')
    setMessage('')
    setTier('normal')

    // Refresh requests
    if (session) {
      api.getSessionRequests(session.id).then(setRequests)
    }
  }

  function handlePaymentCancel() {
    setShowPayment(false)
    setClientSecret(null)
    setPaymentIntentId(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (error || !venue) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-red-500">{error || 'Venue not found'}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-1">{venue.name}</h1>
        <p className="text-gray-500 text-sm mb-6">
          {session ? 'Session active' : 'No active session'}
        </p>

        {session ? (
          <>
            {/* Payment Form */}
            {showPayment && clientSecret && stripePromise && paymentIntentId ? (
              <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
                <h2 className="font-semibold mb-3">Complete Payment</h2>
                <p className="text-gray-600 text-sm mb-4">
                  {songTitle} {songArtist && `- ${songArtist}`}
                </p>
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: { theme: 'stripe' },
                  }}
                >
                  <PaymentForm
                    onSuccess={handlePaymentSuccess}
                    onCancel={handlePaymentCancel}
                    paymentIntentId={paymentIntentId}
                  />
                </Elements>
              </div>
            ) : (
              /* Request Form */
              <form onSubmit={handleSubmit} className="bg-white rounded-lg p-4 shadow-sm mb-4">
                <h2 className="font-semibold mb-3">Request a Song</h2>

                <input
                  type="text"
                  placeholder="Song title *"
                  value={songTitle}
                  onChange={(e) => setSongTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-black"
                  required
                />

                <input
                  type="text"
                  placeholder="Artist (optional)"
                  value={songArtist}
                  onChange={(e) => setSongArtist(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-black"
                />

                {/* Tier Selection */}
                <div className="flex gap-2 mb-3">
                  {(['normal', 'priority', 'asap'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTier(t)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                        tier === t
                          ? 'bg-black text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {t === 'normal' && 'Normal €2'}
                      {t === 'priority' && 'Priority €5'}
                      {t === 'asap' && 'ASAP €10'}
                    </button>
                  ))}
                </div>

                <textarea
                  placeholder="Message to DJ (optional)"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-black resize-none"
                  rows={2}
                />

                <button
                  type="submit"
                  disabled={submitting || !songTitle.trim()}
                  className="w-full py-3 bg-black text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {submitting ? 'Loading...' : `Pay €${TIER_PRICES[tier] / 100} & Submit`}
                </button>
              </form>
            )}

            {/* Request Queue */}
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h2 className="font-semibold mb-3">Queue ({requests.length})</h2>
              {requests.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No requests yet</p>
              ) : (
                <div className="space-y-2">
                  {requests.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{req.song_title}</p>
                        {req.song_artist && (
                          <p className="text-sm text-gray-500">{req.song_artist}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            req.tier === 'asap'
                              ? 'bg-red-100 text-red-700'
                              : req.tier === 'priority'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {req.tier}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            req.status === 'played'
                              ? 'bg-green-100 text-green-700'
                              : req.status === 'accepted'
                                ? 'bg-blue-100 text-blue-700'
                                : req.status === 'rejected'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg p-8 shadow-sm text-center">
            <p className="text-gray-500">No active DJ session at this venue.</p>
            <p className="text-gray-400 text-sm mt-2">Check back later!</p>
          </div>
        )}
      </div>
    </div>
  )
}
