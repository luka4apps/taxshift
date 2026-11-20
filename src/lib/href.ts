/** Join the deploy base path (e.g. "/taxshift/") with a site path. Pure, so it is testable (ADR-08). */
export function joinBase(base: string, path = ''): string {
  const b = base.endsWith('/') ? base : `${base}/`;
  const p = path.replace(/^\/+/, '');
  return `${b}${p}`;
}
