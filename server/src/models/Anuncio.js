import mongoose from 'mongoose';

/**
 * Pauta propia (≠ promoción oficial).
 * Nunca entra al catálogo de /api/promociones.
 * Colección: anuncios
 */
const SLOTS = [
  'home_rail',
  'explorar_mid',
  'cerca_top',
  'side_left',
  'side_right',
  'inicio_side_left',
  'inicio_side_right',
  'explorar_side_left',
  'explorar_side_right',
  'aleatoria',
];

const schema = new mongoose.Schema(
  {
    id_empresa: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Empresa',
      required: true,
      index: true,
    },
    titulo: { type: String, required: true, trim: true, maxlength: 120 },
    copy: { type: String, default: '', maxlength: 280 },
    imagen_url: { type: String, default: '' },
    /** Creativo video (mp4/webm). Si hay video, la PWA lo prioriza sobre imagen. */
    video_url: { type: String, default: '' },
    url_destino: { type: String, default: '' },
    inicia: { type: Date, default: null },
    termina: { type: Date, default: null },
    zonas: {
      type: [String],
      default: ['gdl'],
    },
    slot: {
      type: String,
      enum: SLOTS,
      default: 'home_rail',
      index: true,
    },
    /** inicio | explorar. Vacío en anuncios viejos: se lee del slot. */
    ventana: {
      type: String,
      enum: ['', 'inicio', 'explorar'],
      default: '',
    },
    /** aleatoria, o el id de una posición concreta. */
    posicion: { type: String, default: '' },
    estatus: {
      type: String,
      enum: ['borrador', 'activo', 'pausado', 'vencido'],
      default: 'borrador',
      index: true,
    },
    alcohol: { type: Boolean, default: false },
    impresiones: { type: Number, default: 0 },
    clics: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'anuncios' }
);

schema.index({ slot: 1, estatus: 1, inicia: 1, termina: 1 });
schema.index({ id_empresa: 1, updatedAt: -1 });

export const ANUNCIO_SLOTS = SLOTS;
export default mongoose.model('Anuncio', schema);
