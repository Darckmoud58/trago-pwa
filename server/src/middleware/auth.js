import Usuario from '../models/Usuario.js';
import { verifyAccessToken } from '../lib/jwt.js';

export async function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return res.status(401).json({ message: 'Token requerido' });

  try {
    const payload = verifyAccessToken(token);
    const user = await Usuario.findById(payload.id)
      .select('_id estatus tokenVersion id_rol')
      .lean();

    if (!user) {
      return res.status(401).json({ message: 'Token inválido' });
    }
    if (user.estatus !== 'activo') {
      return res.status(401).json({ message: 'Cuenta no activa' });
    }
    const tv = Number(payload.tv ?? 0);
    const current = Number(user.tokenVersion ?? 0);
    if (tv !== current) {
      return res.status(401).json({ message: 'Sesión revocada' });
    }

    req.userId = user._id;
    req.role = payload.role;
    req.tokenVersion = current;
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido' });
  }
}
