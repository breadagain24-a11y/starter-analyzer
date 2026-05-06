import posthog from 'posthog-js'

const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined
const host = import.meta.env.VITE_POSTHOG_HOST as string | undefined ?? 'https://eu.i.posthog.com'

export function initPostHog() {
  if (!key) return
  posthog.init(key, {
    api_host: host,
    person_profiles: 'identified_only',
    capture_pageview: false, // manually track with router
    capture_pageleave: true,
  })
}

export function identifyUser(id: string, email: string, name: string, tier: string) {
  if (!key) return
  posthog.identify(id, { email, name, tier })
}

export function resetUser() {
  if (!key) return
  posthog.reset()
}

export function track(event: string, properties?: Record<string, unknown>) {
  if (!key) return
  posthog.capture(event, properties)
}

export function trackPageview(path: string) {
  if (!key) return
  posthog.capture('$pageview', { $current_url: window.location.origin + path })
}
