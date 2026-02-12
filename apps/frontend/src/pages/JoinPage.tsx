import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState, useCallback } from 'react'
import { loadStripe, Stripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { ArrowLeft, Disc3, Shield } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { api, Venue, Session, SpotifyTrack, VenuePricing, DEFAULT_PRICING } from '../lib/api'
import SongSearch from '../components/SongSearch'

// LocalStorage key for storing customer's request IDs
const MY_REQUESTS_KEY = 'my_requests'

function getMyRequestIds(): string[] {
  try {
    const stored = localStorage.getItem(MY_REQUESTS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function addMyRequestId(requestId: string) {
  const ids = getMyRequestIds()
  if (!ids.includes(requestId)) {
    const newIds = [requestId, ...ids].slice(0, 10)
    localStorage.setItem(MY_REQUESTS_KEY, JSON.stringify(newIds))
  }
}

function getVenuePricing(venue: Venue | null): VenuePricing {
  if (!venue?.settings?.pricing) return DEFAULT_PRICING
  return { ...DEFAULT_PRICING, ...venue.settings.pricing }
}

const QUICK_AMOUNTS = [5, 10, 15, 20, 30, 50]

type Step = 'search' | 'offer' | 'payment'

// --- Payment Form ---
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
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    })

    if (confirmError) {
      setError(confirmError.message || 'Payment failed')
      setProcessing(false)
      return
    }

    try {
      await api.confirmPayment(paymentIntentId)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm payment')
    }
    setProcessing(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <PaymentElement />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-12 rounded-xl bg-secondary text-foreground font-medium hover:bg-secondary/80 transition-colors"
          disabled={processing}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || processing}
          className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {processing ? 'Processing...' : 'Authorize Payment'}
        </button>
      </div>
    </form>
  )
}

// --- Main JoinPage ---
export default function JoinPage() {
  const { venueSlug } = useParams()
  const navigate = useNavigate()
  const [venue, setVenue] = useState<Venue | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Step state
  const [step, setStep] = useState<Step>('search')

  // Song state
  const [songTitle, setSongTitle] = useState('')
  const [songArtist, setSongArtist] = useState('')
  const [spotifyTrackId, setSpotifyTrackId] = useState<string | null>(null)
  const [songExplicit, setSongExplicit] = useState(false)
  const [message, setMessage] = useState('')

  // Offer state
  const [offerAmount, setOfferAmount] = useState(5)

  // Payment state
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const currency = venue?.settings?.pricing?.currency === 'EUR'
    ? '€'
    : venue?.settings?.pricing?.currency || '€'
  const minPrice = venue ? getVenuePricing(venue).normal : 200
  const minPriceEur = minPrice / 100

  // Load Stripe
  useEffect(() => {
    async function initStripe() {
      const config = await api.getStripeConfig()
      setStripePromise(loadStripe(config.publishable_key))
    }
    initStripe()
  }, [])

  // Load venue + session
  useEffect(() => {
    if (!venueSlug) return

    async function loadData() {
      try {
        setLoading(true)
        const [venueData, sessionData] = await Promise.all([
          api.getVenue(venueSlug!),
          api.getActiveSession(venueSlug!),
        ])
        setVenue(venueData)
        setSession(sessionData)

        // Set initial offer to DJ's min price
        const pricing = getVenuePricing(venueData)
        setOfferAmount(pricing.normal / 100)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [venueSlug])

  const handleSongSelect = useCallback((track: SpotifyTrack | null, manualTitle?: string, manualArtist?: string) => {
    setSubmitError(null)
    if (track) {
      setSongTitle(track.name)
      setSongArtist(track.artists.join(', '))
      setSpotifyTrackId(track.id)
      setSongExplicit(track.explicit ?? false)
    } else if (manualTitle) {
      setSongTitle(manualTitle)
      setSongArtist(manualArtist || '')
      setSpotifyTrackId(null)
      setSongExplicit(false)
    } else {
      setSongTitle('')
      setSongArtist('')
      setSpotifyTrackId(null)
      setSongExplicit(false)
    }
  }, [])

  const handleContinueToOffer = () => {
    if (songTitle.trim()) {
      setStep('offer')
    }
  }

  const handleSubmitOffer = async () => {
    if (!session) return

    setSubmitting(true)
    setSubmitError(null)
    try {
      const { client_secret, payment_intent_id } = await api.createPaymentIntent({
        session_id: session.id,
        song_title: songTitle.trim(),
        song_artist: songArtist.trim() || undefined,
        spotify_track_id: spotifyTrackId || undefined,
        explicit: songExplicit,
        message: message.trim() || undefined,
        tier: 'normal',
        amount: offerAmount * 100,
      })

      setClientSecret(client_secret)
      setPaymentIntentId(payment_intent_id)
      setStep('payment')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create payment')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePaymentSuccess = async () => {
    if (paymentIntentId) {
      try {
        const result = await api.confirmPayment(paymentIntentId)
        if (result.request?.id) {
          addMyRequestId(result.request.id)
        }
      } catch {
        // Already confirmed
      }
    }
    // Navigate to requests tab
    navigate('/?tab=requests')
  }

  const handlePaymentCancel = () => {
    setStep('offer')
    setClientSecret(null)
    setPaymentIntentId(null)
  }

  const handleBack = () => {
    if (step === 'offer') setStep('search')
    else if (step === 'payment') handlePaymentCancel()
    else navigate(`/venue/${venueSlug}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !venue) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-destructive">{error || 'Venue not found'}</p>
        <button
          onClick={() => navigate('/')}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          type="button"
        >
          Back to DJs
        </button>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-muted-foreground">No active session at this venue.</p>
        <button
          onClick={() => navigate(`/venue/${venueSlug}`)}
          className="text-sm text-primary hover:text-primary/80 transition-colors"
          type="button"
        >
          Go back
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-md px-4 pb-8">
        {/* Back + Header */}
        <div className="flex items-center gap-3 pt-6">
          <button
            onClick={handleBack}
            className="flex items-center justify-center rounded-lg p-1 text-muted-foreground hover:text-foreground transition-colors"
            type="button"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-foreground">
            {step === 'search' && 'Choose a Song'}
            {step === 'offer' && 'Make Your Offer'}
            {step === 'payment' && 'Authorize Payment'}
          </h1>
        </div>

        <div className="flex flex-col gap-6 pt-6">
          {/* STEP 1: Song Search */}
          {step === 'search' && (
            <>
              <SongSearch onSelect={handleSongSelect} disabled={false} />

              {/* Message field */}
              {songTitle && (
                <textarea
                  placeholder="Message to DJ (optional)"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded-xl bg-card border border-border px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  rows={2}
                />
              )}

              {/* Continue button */}
              {songTitle && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-md border-t border-border">
                  <div className="mx-auto max-w-md">
                    <button
                      onClick={handleContinueToOffer}
                      className="flex h-14 w-full items-center justify-center rounded-xl bg-primary font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                      type="button"
                    >
                      Continue to Offer
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* STEP 2: Offer Screen */}
          {step === 'offer' && (
            <>
              {/* Selected song summary */}
              <div className="flex items-center gap-3 rounded-xl bg-card p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <Disc3 className="h-6 w-6 text-primary" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="font-medium text-foreground truncate">{songTitle}</span>
                  {songArtist && (
                    <span className="text-sm text-muted-foreground truncate">{songArtist}</span>
                  )}
                </div>
              </div>

              {/* Amount display */}
              <div className="flex flex-col items-center gap-2 py-4">
                <span className="text-sm text-muted-foreground">Your offer</span>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-5xl font-bold text-foreground">
                    {currency}{offerAmount}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  Minimum: {currency}{minPriceEur}
                </span>
              </div>

              {/* Quick amounts */}
              <div className="grid grid-cols-3 gap-2">
                {QUICK_AMOUNTS.filter((a) => a >= minPriceEur).map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setOfferAmount(amount)}
                    className={`flex h-12 items-center justify-center rounded-lg font-mono font-bold transition-colors ${
                      offerAmount === amount
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card text-foreground hover:bg-secondary'
                    }`}
                    type="button"
                  >
                    {currency}{amount}
                  </button>
                ))}
              </div>

              {/* Slider */}
              <div className="flex flex-col gap-3 px-1">
                <Slider
                  value={[offerAmount]}
                  onValueChange={(val: number[]) => setOfferAmount(val[0])}
                  min={minPriceEur}
                  max={100}
                  step={1}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{currency}{minPriceEur}</span>
                  <span>{currency}100</span>
                </div>
              </div>

              {/* Trust signal */}
              <div className="flex items-center gap-2 rounded-lg bg-primary/10 p-3">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-xs text-primary">
                  You are only charged if your song is played
                </span>
              </div>

              {submitError && (
                <p className="text-sm text-destructive text-center">{submitError}</p>
              )}

              {/* Submit CTA */}
              <button
                onClick={handleSubmitOffer}
                disabled={submitting}
                className="flex h-14 w-full items-center justify-center rounded-xl bg-primary font-semibold text-primary-foreground text-base transition-colors hover:bg-primary/90 disabled:opacity-50"
                type="button"
              >
                {submitting ? 'Loading...' : `Send Request — ${currency}${offerAmount}`}
              </button>
            </>
          )}

          {/* STEP 3: Payment */}
          {step === 'payment' && clientSecret && stripePromise && paymentIntentId && (
            <>
              {/* Song summary */}
              <div className="flex items-center gap-3 rounded-xl bg-card p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <Disc3 className="h-6 w-6 text-primary" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="font-medium text-foreground truncate">{songTitle}</span>
                  {songArtist && (
                    <span className="text-sm text-muted-foreground truncate">{songArtist}</span>
                  )}
                </div>
                <span className="font-mono font-bold text-primary shrink-0">
                  {currency}{offerAmount}
                </span>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Your card will be authorized now. You'll only be charged if the DJ plays your song.
              </p>

              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: { theme: 'night' },
                }}
              >
                <PaymentForm
                  onSuccess={handlePaymentSuccess}
                  onCancel={handlePaymentCancel}
                  paymentIntentId={paymentIntentId}
                />
              </Elements>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
