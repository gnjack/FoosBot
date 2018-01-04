import { verify } from 'jsonwebtoken'

export default function authenticate (installation, auth) {
  if (!auth) {
    throw new Error('Missing Authorization header')
  }
  const jwt = auth.replace(/^JWT /i, '')
  verify(jwt, installation.oauthSecret)
}
