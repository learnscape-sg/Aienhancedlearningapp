export const COMPAT_TENANT_IDS = ['tenant_cn_bamboo'] as const;

export function shouldUseTenantCompat(tenantId: string | null): boolean {
  return tenantId != null && COMPAT_TENANT_IDS.includes(tenantId as (typeof COMPAT_TENANT_IDS)[number]);
}
