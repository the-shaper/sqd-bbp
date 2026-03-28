export const PARTYKIT_HOST = import.meta.env.VITE_PARTYKIT_HOST || 'localhost:1999';
export const PARTYKIT_PARTY = import.meta.env.VITE_PARTYKIT_PARTY || 'main';
export const PARTYKIT_WS_PROTOCOL = import.meta.env.PROD ? 'wss' : 'ws';
export const PARTYKIT_HTTP_PROTOCOL = import.meta.env.PROD ? 'https' : 'http';
