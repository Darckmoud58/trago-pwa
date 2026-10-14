import jwt from 'jsonwebtoken';
import { getEnv } from '../config/env.js';

const ALG = 'HS256';
const EXPIRES = '24h';

export function signAccessToken(payload) {
  const { JWT_SECRET } = getEnv();
  return jwt.sign(payload, JWT_SECRET, {
    algorithm: ALG,
    expiresIn: EXPIRES,
  });
}

export function verifyAccessToken(token) {
  const { JWT_SECRET } = getEnv();
  return jwt.verify(token, JWT_SECRET, {
    algorithms: [ALG],
  });
}
