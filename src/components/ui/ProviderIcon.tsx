import type { ModelProvider } from '../../constants/models'

interface ProviderIconProps {
  provider: ModelProvider
  size?: number
}

export function ProviderIcon({ provider, size = 18 }: ProviderIconProps) {
  if (provider === 'anthropic') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M13.827 3.52l5.51 16.96H22L14.314 3.52h-0.487zm-3.654 0L3 20.48h2.663l1.63-5.015h6.167L15.09 20.48h2.663L10.66 3.52h-0.487zm.543 4.86L13.2 13.95H8.23l2.487-5.57z" fill="currentColor"/>
      </svg>
    )
  }
  if (provider === 'google') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 11v2.4h3.97c-.16 1.03-1.2 3.02-3.97 3.02-2.39 0-4.34-1.98-4.34-4.42S9.61 7.58 12 7.58c1.36 0 2.27.58 2.79 1.08l1.9-1.83C15.47 5.69 13.89 5 12 5 8.13 5 5 8.13 5 12s3.13 7 7 7c4.04 0 6.72-2.84 6.72-6.84 0-.46-.05-.81-.11-1.16H12z" fill="currentColor"/>
      </svg>
    )
  }
  // OpenAI
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073z" fill="currentColor"/>
    </svg>
  )
}
