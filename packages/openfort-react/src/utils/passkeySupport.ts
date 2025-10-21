/**
 * Determines whether passkey registration is available in the current context.
 * Returns `false` when WebAuthn registration is blocked by the browser or
 * embedding environment (e.g. sandboxed iframes).
 *
 * Optimistically returns `true` during SSR to avoid stripping passkey support
 * before the browser evaluates permissions.
 */
export function isPasskeyRegistrationAvailable(): boolean {
  // SSR: optimistically return true
  if (typeof window === 'undefined' || typeof document === 'undefined') return true

  // Check basic WebAuthn requirements
  if (!window.isSecureContext) return false
  if (!('PublicKeyCredential' in window)) return false
  if (!navigator?.credentials?.create) return false

  // Check permissions policy if available
  const permissionsPolicy: any = (document as any).permissionsPolicy ?? (document as any).featurePolicy
  if (!permissionsPolicy) return true

  try {
    const feature = 'publickey-credentials-create'
    
    if (permissionsPolicy.allowsFeature) {
      return permissionsPolicy.allowsFeature(feature)
    }
    if (permissionsPolicy.isFeatureEnabled) {
      return permissionsPolicy.isFeatureEnabled(feature)
    }
    if (permissionsPolicy.allowedFeatures) {
      const features = permissionsPolicy.allowedFeatures()
      return Array.isArray(features) ? features.includes(feature) : true
    }
  } catch {
    return false
  }

  return true
}
