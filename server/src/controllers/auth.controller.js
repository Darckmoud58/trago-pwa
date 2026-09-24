import Usuario from '../models/Usuario.js';
import Rol from '../models/Rol.js';
import Nivel from '../models/Nivel.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

function yearsFromBirth(birthDate) {
  const b = new Date(birthDate);
  const now = new Date();
  let y = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) y -= 1;
  return y;
}

function splitName(fullName) {
  const parts = String(fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return { nombre: 'Usuario', ape_paterno: '', ape_materno: '' };
  if (parts.length === 1) return { nombre: parts[0], ape_paterno: '', ape_materno: '' };
  if (parts.length === 2) {
    return { nombre: parts[0], ape_paterno: parts[1], ape_materno: '' };
  }
  return {
    nombre: parts[0],
    ape_paterno: parts[1],
    ape_materno: parts.slice(2).join(' '),
  };
}

function publicUser(user, extras = {}) {
  const nombreCompleto = [user.nombre, user.ape_paterno, user.ape_materno]
    .filter(Boolean)
    .join(' ');
  return {
    id: user._id,
    name: nombreCompleto,
    nombre: user.nombre,
    ape_paterno: user.ape_paterno,
    ape_materno: user.ape_materno,
    email: user.correo,
    correo: user.correo,
    edad: user.edad,
    puntos: user.puntos ?? 0,
    estatus: user.estatus,
    band: user.edad >= 18 ? 'adult' : 'teen',
    id_rol: user.id_rol || null,
    id_nivel: user.id_nivel || null,
    rol: extras.rol || null,
    nivel: extras.nivel || null,
  };
}

async function loadUserExtras(user) {
  const [rol, nivel] = await Promise.all([
    user.id_rol ? Rol.findById(user.id_rol).lean() : null,
    user.id_nivel ? Nivel.findById(user.id_nivel).lean() : null,
  ]);
  return {
    rol: rol
      ? { id: rol._id, nombre: rol.nombre, codigo: rol.codigo }
      : null,
    nivel: nivel
      ? {
          id: nivel._id,
          nombre: nivel.nombre,
          pts_min: nivel.pts_min,
          pts_max: nivel.pts_max,
          beneficio: nivel.beneficio,
          descripcion: nivel.descripcion,
        }
      : null,
  };
}

export async function register(req, res) {
  try {
    const {
      name,
      nombre,
      ape_paterno,
      ape_materno,
      email,
      correo,
      password,
      birthDate,
      edad,
    } = req.body;

    const mail = (correo || email || '').toLowerCase().trim();
    const names =
      nombre || ape_paterno
        ? {
            nombre: (nombre || '').trim() || 'Usuario',
            ape_paterno: (ape_paterno || '').trim(),
            ape_materno: (ape_materno || '').trim(),
          }
        : splitName(name);

    let years = Number(edad);
    let fechaNac = null;
    if (birthDate) {
      years = yearsFromBirth(birthDate);
      fechaNac = new Date(birthDate);
    }

    if (!names.nombre || !mail || !password || !Number.isFinite(years)) {
      return res.status(400).json({
        message: 'nombre/correo/password y edad (o birthDate) son requeridos',
      });
    }

    if (years < 13) {
      return res.status(400).json({ message: 'Debes tener al menos 13 años' });
    }

    const exists = await Usuario.findOne({ correo: mail });
    if (exists) return res.status(409).json({ message: 'El usuario ya existe' });

    const [roleDoc, nivelDoc] = await Promise.all([
      Rol.findOne({ codigo: 'user', estatus: 'activo' }),
      Nivel.findOne({ estado: 'activo' }).sort({ pts_min: 1 }),
    ]);

    const hash = await bcrypt.hash(password, 10);
    const user = new Usuario({
      ...names,
      correo: mail,
      password: hash,
      edad: years,
      fecha_nacimiento: fechaNac,
      puntos: 0,
      estatus: 'activo',
      id_rol: roleDoc?._id || null,
      id_nivel: nivelDoc?._id || null,
    });
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: roleDoc?.codigo || 'user' },
      process.env.JWT_SECRET || 'changeme',
      { expiresIn: '7d' }
    );

    user.token_login = token;
    await user.save();

    const extras = await loadUserExtras(user);
    res.status(201).json({ token, user: publicUser(user, extras) });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ message: 'El usuario ya existe' });
    }
    console.error('register error:', e.message);
    res.status(500).json({ message: 'Error del servidor' });
  }
}

export async function login(req, res) {
  try {
    const { email, correo, password } = req.body;
    const mail = (correo || email || '').toLowerCase().trim();

    if (!mail || !password) {
      return res.status(400).json({ message: 'Correo y contraseña requeridos' });
    }

    const user = await Usuario.findOne({ correo: mail });
    if (!user || user.estatus !== 'activo') {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Credenciales inválidas' });

    const roleDoc = user.id_rol ? await Rol.findById(user.id_rol) : null;
    const token = jwt.sign(
      { id: user._id, role: roleDoc?.codigo || 'user' },
      process.env.JWT_SECRET || 'changeme',
      { expiresIn: '7d' }
    );

    user.token_login = token;
    await user.save();

    const extras = await loadUserExtras(user);
    res.json({ token, user: publicUser(user, extras) });
  } catch (e) {
    console.error('login error:', e.message);
    res.status(500).json({ message: 'Error del servidor' });
  }
}

export async function profile(req, res) {
  try {
    const user = await Usuario.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    const extras = await loadUserExtras(user);
    res.json({ user: publicUser(user, extras) });
  } catch (e) {
    res.status(500).json({ message: 'Error del servidor' });
  }
}
