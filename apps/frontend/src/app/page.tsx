import { Suspense } from 'react'
import HomePage from '@/views/HomePage'

export default function Page() {
  return (
    <Suspense>
      <HomePage />
    </Suspense>
  )
}
