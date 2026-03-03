export const COMPAT_TENANT_IDS = ['tenant_cn_bamboo'] as const;

const VIEWPORT_WIDTH_MIN = 800;
const VIEWPORT_WIDTH_MAX = 1280;

/** Compute viewport width from device resolution (clamped 800–1280). */
export function getCompatViewportWidth(): number {
  if (typeof window === 'undefined') return VIEWPORT_WIDTH_MAX;
  const cssWidth = window.screen.width / (window.devicePixelRatio || 1);
  return Math.max(VIEWPORT_WIDTH_MIN, Math.min(VIEWPORT_WIDTH_MAX, Math.round(cssWidth)));
}

/** Viewport meta content for tablet compat (width from screen resolution). */
export function getCompatViewportContent(): string {
  return `width=${getCompatViewportWidth()}, user-scalable=yes, viewport-fit=cover`;
}

export function shouldUseTenantCompat(tenantId: string | null): boolean {
  return tenantId != null && COMPAT_TENANT_IDS.includes(tenantId as (typeof COMPAT_TENANT_IDS)[number]);
}

/**
 * Apply tablet compat for bamboo tenant when user is unauthenticated or student.
 * Teachers/parents on bamboo get normal (non-compat) UI after login.
 *
 * Temporarily disabled (Option A): return false to test normal UI on Bamboo tablets.
 * If test results are good, can keep this or remove COMPAT_TENANT_IDS for bamboo.
 */
export function shouldUseStudentTabletCompat(
  tenantId: string | null,
  role?: string | null
): boolean {
  return false; // Option A: disable compat, test normal state on bamboo tablets
  // if (!tenantId) return false;
  // if (role != null && role !== 'student') return false; // teacher/parent: no compat
  // return COMPAT_TENANT_IDS.includes(tenantId as (typeof COMPAT_TENANT_IDS)[number]);
}
