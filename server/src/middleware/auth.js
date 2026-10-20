import Usuario from '../models/Usuario.js';
import Rol from '../models/Rol.js';
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

    // Rol desde DB (no confiar en claim JWT, puede estar desfasado).
    const roleDoc = user.id_rol
      ? await Rol.findById(user.id_rol).select('codigo').lean()
      : null;

    req.userId = user._id;
    req.role = roleDoc?.codigo || 'user';
    req.tokenVersion = current;
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido' });
  }
}
