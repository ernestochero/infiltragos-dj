import { NextRequest } from 'next/server';

export const CID_COOKIE = 'cid';

// Read client-id from cookie. If absent, return null.
export function getClientId(req: NextRequest): string | null {
  const cid = req.cookies.get(CID_COOKIE)?.value;
  return cid && cid.length > 0 ? cid : null;
}

