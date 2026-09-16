import Usuario from '../models/Usuario.js';
import Rol from '../models/Rol.js';
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

export async function register(req, res) {
  try {
    const { name, email, password, birthDate } = req.body;

    if (!name || !email || !password || !birthDate) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }

    const years = yearsFromBirth(birthDate);
    if (years < 13) {
      return res.status(400).json({ message: 'Debes tener al menos 13 años' });
    }

    const exists = await Usuario.findOne({ email: email.toLowerCase().trim() });
    if (exists) return res.status(409).json({ message: 'El usuario ya existe' });

    const roleDoc = await Rol.findOne({ code: 'user' });
    const hash = await bcrypt.hash(password, 10);
    const band = years >= 18 ? 'adult' : 'teen';

    const user = new Usuario({
      email: email.toLowerCase().trim(),
      passwordHash: hash,
      profile: { name: name.trim() },
      age: {
        birthDate: new Date(birthDate),
        yearsAtSignup: years,
        confirmed18: years >= 18,
        confirmedAt: new Date(),
        band,
      },
      role: 'user',
      roleId: roleDoc?._id?.toString() || 'rol-user',
      nivelId: 'nivel-novato',
      points: 0,
    });
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'changeme',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.profile.name,
        email: user.email,
        band: user.age.band,
        points: user.points,
      },
    });
  } catch (e) {
    console.error('register error:', e.message);
    res.status(500).json({ message: 'Error del servidor' });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Correo y contraseña requeridos' });
    }

    const user = await Usuario.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Credenciales inválidas' });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'changeme',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.profile.name,
        email: user.email,
        band: user.age.band,
        points: user.points ?? 0,
      },
    });
  } catch (e) {
    console.error('login error:', e.message);
    res.status(500).json({ message: 'Error del servidor' });
  }
}

export async function profile(req, res) {
  try {
    const user = await Usuario.findById(req.userId).select('-passwordHash');
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json({ user });
  } catch (e) {
    res.status(500).json({ message: 'Error del servidor' });
  }
}
