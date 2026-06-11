export function getPublicToken(): string | null {
  return localStorage.getItem('pub_auth_token');
}
