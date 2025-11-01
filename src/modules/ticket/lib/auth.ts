import { NextRequest } from 'next/server';
import { hasRole } from '@core/api/auth';

export function isTicketAdmin(req: NextRequest) {
  const headerToken = req.headers.get('x-admin-token');
  if (headerToken && process.env.DJ_ADMIN_TOKEN && headerToken === process.env.DJ_ADMIN_TOKEN) {
    return true;
  }
  return hasRole(req, ['ADMIN']);
}
