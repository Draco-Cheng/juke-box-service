// Custom API Error class with user-friendly messages
export class ApiError extends Error {
  public readonly statusCode: number
  public readonly userMessage: string
  public readonly isNetworkError: boolean

  constructor(statusCode: number, message: string, userMessage?: string) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.isNetworkError = false
    this.userMessage = userMessage || this.getDefaultUserMessage(statusCode, message)
  }

  private getDefaultUserMessage(statusCode: number, message: string): string {
    // Map specific error messages to user-friendly versions
    const messageMap: Record<string, string> = {
      'Venue not found': 'This venue does not exist or has been removed.',
      'No active session': 'No DJ is currently playing at this venue.',
      'Session not found': 'This session has ended or does not exist.',
      'DJ not found': 'DJ account not found. Please check your email.',
      'Request not found': 'This request could not be found.',
      'Payment failed': 'Payment could not be processed. Please try again.',
      'Invalid tier': 'Invalid request tier selected.',
      'Session is paused': 'Requests are currently paused. Please try again later.',
      'Content blocked': 'This song is not available at this venue.',
    }

    if (messageMap[message]) {
      return messageMap[message]
    }

    // Map status codes to default messages
    switch (statusCode) {
      case 400:
        return 'Invalid request. Please check your input and try again.'
      case 401:
        return 'Please log in to continue.'
      case 403:
        return 'You do not have permission to perform this action.'
      case 404:
        return 'The requested resource was not found.'
      case 409:
        return 'This action conflicts with the current state. Please refresh and try again.'
      case 422:
        return 'The provided data is invalid. Please check and try again.'
      case 429:
        return 'Too many requests. Please wait a moment and try again.'
      case 500:
      case 502:
      case 503:
        return 'Server error. Please try again later.'
      default:
        return 'Something went wrong. Please try again.'
    }
  }
}

export class NetworkError extends Error {
  public readonly isNetworkError = true
  public readonly userMessage: string

  constructor(message: string = 'Network error') {
    super(message)
    this.name = 'NetworkError'
    this.userMessage = 'Unable to connect. Please check your internet connection.'
  }
}

// Helper to check if error is an API error
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

// Helper to check if error is a network error
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError || (error instanceof Error && error.message === 'Failed to fetch')
}

// Get user-friendly message from any error
export function getUserErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.userMessage
  }
  if (isNetworkError(error)) {
    return 'Unable to connect. Please check your internet connection.'
  }
  if (error instanceof Error) {
    // Check for common fetch errors
    if (error.message === 'Failed to fetch') {
      return 'Unable to connect. Please check your internet connection.'
    }
    return error.message
  }
  return 'An unexpected error occurred. Please try again.'
}
