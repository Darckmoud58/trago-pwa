import mongoose from 'mongoose';

/**
 * Pauta propia (≠ promoción oficial).
 * Nunca entra al catálogo de /api/promociones.
 * Colección: anuncios
 */
const SLOTS = ['home_rail', 'explorar_mid', 'cerca_top'];

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
