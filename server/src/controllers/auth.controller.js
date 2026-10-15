import Usuario from '../models/Usuario.js';
import Rol from '../models/Rol.js';
import Nivel from '../models/Nivel.js';
import bcrypt from 'bcryptjs';
import {
  bandFromAge,
  yearsFromBirth,
  resolveUserAge,
} from '../lib/ageGate.js';
import {
  TIMING_DUMMY_HASH,
  ageFromBirthDateStrict,
  loginSchema,
  registerSchema,
  zodErrorMessage,
} from '../lib/authValidate.js';
import { signAccessToken } from '../lib/jwt.js';

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
  const age = resolveUserAge(user);
  const band = bandFromAge(age) || 'teen';
  return {
    id: user._id,
    name: nombreCompleto,
    nombre: user.nombre,
    ape_paterno: user.ape_paterno,
    ape_materno: user.ape_materno,
    email: user.correo,
    correo: user.correo,
    edad: age,
    puntos: user.puntos ?? 0,
    estatus: user.estatus,
    band,
    age: { band, years: age },
    id_rol: user.id_rol || null,
    id_nivel: user.id_nivel || null,
    rol: extras.rol || null,
    nivel: extras.nivel || null,
  };
}

async function refreshStoredAge(user) {
  if (!user?.fecha_nacimiento) return user;
  const age = yearsFromBirth(user.fecha_nacimiento);
  if (age != null && age !== user.edad) {
    user.edad = age;
    await user.save();
  }
  return user;
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

function issueToken(user, roleCode) {
  const age = resolveUserAge(user);
  const band = bandFromAge(age) || 'teen';
  return signAccessToken({
    id: user._id,
    role: roleCode || 'user',
    band,
    tv: Number(user.tokenVersion || 0),
  });
}

export async function register(req, res) {
  try {
    const parsed = registerSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ message: zodErrorMessage(parsed.error) });
    }
    const data = parsed.data;
    const mail = String(data.correo || data.email)
      .toLowerCase()
      .trim();
    const names =
      data.nombre || data.ape_paterno
        ? {
            nombre: (data.nombre || '').trim() || 'Usuario',
            ape_paterno: (data.ape_paterno || '').trim(),
            ape_materno: (data.ape_materno || '').trim(),
          }
        : splitName(data.name);

    let years;
    try {
      years = ageFromBirthDateStrict(data.birthDate);
    } catch (e) {
      return res.status(400).json({ message: e.message });
    }
    const fechaNac = new Date(`${data.birthDate}T12:00:00.000Z`);

    const exists = await Usuario.findOne({ correo: mail }).select('_id').lean();
    if (exists) return res.status(409).json({ message: 'El usuario ya existe' });

    const [roleDoc, nivelDoc] = await Promise.all([
      Rol.findOne({ codigo: 'user', estatus: 'activo' }),
      Nivel.findOne({ estado: 'activo' }).sort({ pts_min: 1 }),
    ]);

    const hash = await bcrypt.hash(data.password, 12);
    const user = new Usuario({
      ...names,
      correo: mail,
      password: hash,
      edad: years,
      fecha_nacimiento: fechaNac,
      puntos: 0,
      estatus: 'activo',
      tokenVersion: 0,
      id_rol: roleDoc?._id || null,
      id_nivel: nivelDoc?._id || null,
    });
    await user.save();

    const token = issueToken(user, roleDoc?.codigo || 'user');
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
    const parsed = loginSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ message: zodErrorMessage(parsed.error) });
    }
    const mail = String(parsed.data.correo || parsed.data.email)
      .toLowerCase()
      .trim();
    const { password } = parsed.data;

    const user = await Usuario.findOne({ correo: mail });
    if (!user || user.estatus !== 'activo') {
      await bcrypt.compare(password, TIMING_DUMMY_HASH);
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Credenciales inválidas' });

    await refreshStoredAge(user);

    const roleDoc = user.id_rol ? await Rol.findById(user.id_rol) : null;
    const token = issueToken(user, roleDoc?.codigo || 'user');
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
    await refreshStoredAge(user);
    const extras = await loadUserExtras(user);
    res.json({ user: publicUser(user, extras) });
  } catch (e) {
    res.status(500).json({ message: 'Error del servidor' });
  }
}
