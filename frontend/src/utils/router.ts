/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ParsedRoute {
  raw: string;
  path: string;
  segments: string[];
  params: {
    sessionId?: string;
    eventId?: string;
    certificateId?: string;
  };
  queryParams: Record<string, string>;
}

export function parseHash(hashString?: string): ParsedRoute {
  const raw =
    hashString !== undefined
      ? hashString
      : typeof window !== 'undefined'
      ? window.location.hash
      : '';

  let clean = raw.startsWith('#') ? raw.slice(1) : raw;
  if (!clean.startsWith('/')) {
    clean = '/' + clean;
  }

  const [pathWithParams, queryString] = clean.split('?');
  const path = pathWithParams || '/';
  const segments = path.split('/').filter(Boolean);

  const queryParams: Record<string, string> = {};
  if (queryString) {
    const searchParams = new URLSearchParams(queryString);
    searchParams.forEach((val, key) => {
      queryParams[key] = val;
    });
  }

  const params: { sessionId?: string; eventId?: string; certificateId?: string } = {};

  if (segments[0] === 'events' && segments[1]) {
    params.eventId = decodeURIComponent(segments[1]);
  } else if (segments[0] === 'sessions' && segments[1]) {
    params.sessionId = decodeURIComponent(segments[1]);
  } else if (segments[0] === 'verify' && segments[1]) {
    params.certificateId = decodeURIComponent(segments[1]);
  } else if (segments[0] === 'certificates' && segments[1]) {
    params.certificateId = decodeURIComponent(segments[1]);
  }

  return {
    raw,
    path,
    segments,
    params,
    queryParams,
  };
}

export function isRouteProtected(path: string): boolean {
  if (
    path === '/' ||
    path === '/login' ||
    path === '/signup' ||
    path === '/about' ||
    path === '/events' ||
    path.startsWith('/events/') ||
    path === '/sessions' ||
    path.startsWith('/sessions/') ||
    path.startsWith('/verify/')
  ) {
    return false;
  }
  return true;
}

export function getRequiredRoleForRoute(path: string): 'admin' | 'super_admin' | null {
  if (path === '/users') {
    return 'super_admin';
  }
  if (path === '/form-builder' || path === '/reviews') {
    return 'admin';
  }
  return null;
}
