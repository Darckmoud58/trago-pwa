import { Link } from 'react-router-dom';
import './Legal.css';

export default function AvisoPrivacidad() {
  return (
    <article className="legal">
      <p className="label">Legal</p>
      <h1>Aviso de privacidad</h1>
      <p className="lead">
        En cumplimiento de la Ley Federal de Protección de Datos Personales en
        Posesión de los Particulares (LFPDPPP) y su Reglamento. Última
        actualización: 24 de septiembre de 2026.
      </p>

      <h2>1. Responsable</h2>
      <p>
        El responsable del tratamiento es <strong>TraGo</strong>. Para ejercer
        derechos o consultas sobre datos personales:{' '}
        <a href="mailto:privacidad@trago.app">privacidad@trago.app</a>.
      </p>

      <h2>2. Datos que recabamos</h2>
      <ul>
        <li>
          <strong>Identificación:</strong> nombre, apellidos, correo y
          contraseña (almacenada de forma cifrada/hash).
        </li>
        <li>
          <strong>Edad:</strong> fecha de nacimiento o edad declarada, para
          distinguir perfiles 13–17 y 18+ (alcohol).
        </li>
        <li>
          <strong>Ubicación:</strong> coordenadas GPS solo cuando activas
          “Cerca de mí”, para sugerir lugares cercanos.
        </li>
        <li>
          <strong>Uso:</strong> reseñas, canjes, puntos e insignias.
        </li>
        <li>
          <strong>Favoritos locales:</strong> lugares que guardas en tu
          dispositivo para uso sin internet (no se envían a servidores salvo que
          inicies sesión y actives sincronización futura).
        </li>
        <li>
          <strong>Técnicos:</strong> token de sesión y datos necesarios para el
          funcionamiento de la PWA.
        </li>
      </ul>

      <h2>3. Finalidades</h2>
      <ul>
        <li>Crear y autenticar tu cuenta.</li>
        <li>Aplicar filtros de edad (ocultar alcohol/nocturno a menores de 18).</li>
        <li>Mostrar promociones y ubicaciones cercanas.</li>
        <li>Operar puntos, cupones y favoritos.</li>
        <li>Mejorar seguridad, rendimiento y experiencia del servicio.</li>
      </ul>
      <p>
        <strong>No vendemos</strong> datos personales a terceros con fines
        publicitarios ajenos a TraGo.
      </p>

      <h2>4. Menores de edad</h2>
      <p>
        TraGo permite cuentas desde los 13 años. El contenido de bebidas
        alcohólicas está restringido a mayores de 18. No recabamos de forma
        intencional datos de menores de 13 años; si ocurre, los eliminaremos.
        Padres o tutores pueden solicitar la baja de una cuenta en el correo de
        privacidad.
      </p>

      <h2>5. Transferencias</h2>
      <p>
        Los datos pueden alojarse en proveedores de infraestructura (nube,
        base de datos, hosting) necesarios para operar TraGo, bajo obligaciones
        de confidencialidad, o cuando lo exija una autoridad competente.
      </p>

      <h2>6. Derechos ARCO</h2>
      <p>
        Puedes solicitar acceso, rectificación, cancelación u oposición al
        tratamiento de tus datos, así como la eliminación de tu cuenta,
        escribiendo a{' '}
        <a href="mailto:privacidad@trago.app">privacidad@trago.app</a>.
        Responderemos en los plazos que marca la normativa aplicable.
      </p>

      <h2>7. Conservación y seguridad</h2>
      <p>
        Conservamos la información mientras la cuenta esté activa o exista una
        obligación legal. Usamos medidas técnicas razonables (hash de
        contraseñas, control de acceso, HTTPS cuando esté disponible). Ningún
        sistema es 100 % seguro: no reutilices contraseñas críticas.
      </p>

      <h2>8. Cambios</h2>
      <p>
        Podemos actualizar este aviso. La versión vigente estará en esta ruta.
        El uso continuado tras un cambio sustancial implica que conoces el nuevo
        texto.
      </p>

      <h2>9. Consentimiento</h2>
      <p>
        Al registrarte confirmas que leíste este aviso y los{' '}
        <Link to="/terminos">Términos y condiciones</Link>, y consientes el
        tratamiento descrito.
      </p>

      <p className="muted legal-back">
        <Link to="/">← Volver al inicio</Link>
      </p>
    </article>
  );
}
