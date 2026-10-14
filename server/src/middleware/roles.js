import Rol from '../models/Rol.js';
import Empresa from '../models/Empresa.js';
import Usuario from '../models/Usuario.js';

/** Códigos de rol que operan el panel de cadena. */
export const CHAIN_ROLE_CODES = new Set(['empresa', 'chain']);

export function isChainRole(codigo) {
  return CHAIN_ROLE_CODES.has(String(codigo || '').toLowerCase());
}

/**
 * Requiere JWT + rol empresa|chain|admin.
 * Adjunta req.user, req.roleCodigo, req.empresa (si es dueño).
 * Admin puede pasar ?empresaId= para operar otra cadena.
 */
export async function requireChain(req, res, next) {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Token requerido' });
    }

    const user = await Usuario.findById(req.userId).lean();
    if (!user || user.estatus !== 'activo') {
      return res.status(401).json({ message: 'Usuario no válido' });
    }

    const roleDoc = user.id_rol ? await Rol.findById(user.id_rol).lean() : null;
    const codigo = roleDoc?.codigo || req.role || 'user';
    const isAdmin = codigo === 'admin';
    const isChain = isChainRole(codigo);

    let empresa = null;
    if (isAdmin && (req.query.empresaId || req.body?.empresaId)) {
      const eid = req.query.empresaId || req.body.empresaId;
      empresa = await Empresa.findById(eid).lean();
    } else {
      empresa = await Empresa.findOne({
        id_dueno: user._id,
        estatus: 'activo',
      }).lean();
    }

    // Dueño de cadena cuenta aunque el JWT aún diga "user" (tras registro).
    if (!isAdmin && !isChain && !empresa) {
      return res.status(403).json({
        message: 'Se requiere rol de cadena (empresa) o admin.',
      });
    }

    req.user = user;
    req.roleCodigo = codigo;
    req.isAdmin = isAdmin;
    req.empresa = empresa;
    next();
  } catch (e) {
    console.error('requireChain:', e.message);
    return res.status(500).json({ message: 'Error del servidor' });
  }
}

export async function requireAdmin(req, res, next) {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Token requerido' });
    }
    const user = await Usuario.findById(req.userId).lean();
    const roleDoc = user?.id_rol ? await Rol.findById(user.id_rol).lean() : null;
    if (!user || roleDoc?.codigo !== 'admin') {
      return res.status(403).json({ message: 'Se requiere rol admin' });
    }
    req.user = user;
    req.roleCodigo = 'admin';
    next();
  } catch (e) {
    return res.status(500).json({ message: 'Error del servidor' });
  }
}
