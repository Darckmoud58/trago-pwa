import { Link } from 'react-router-dom';
import './Legal.css';

export default function Terminos() {
  return (
    <article className="legal">
      <p className="label">Legal</p>
      <h1>Términos y condiciones</h1>
      <p className="lead">
        Última actualización: 24 de septiembre de 2026. Al usar TraGo aceptas
        estos términos. Si no estás de acuerdo, no uses el servicio.
      </p>

      <h2>1. Qué es TraGo</h2>
      <p>
        TraGo es una aplicación que te ayuda a descubrir y consultar
        promociones vigentes cerca de ti. Funciona como{' '}
        <strong>directorio e intermediario informativo</strong>: no vende
        productos, no opera sucursales y no garantiza que una promoción se
        aplique en caja. La vigencia, el precio y las condiciones las confirma
        siempre el establecimiento.
      </p>

      <h2>2. Edad y contenido con alcohol</h2>
      <ul>
        <li>
          Puedes crear una cuenta desde los <strong>13 años</strong>.
        </li>
        <li>
          El contenido marcado como alcohol o nocturno está restringido a
          personas de <strong>18 años o más</strong>, conforme a la legislación
          mexicana.
        </li>
        <li>
          Los menores de 18 no deben acceder, compartir ni canjear ese
          contenido. TraGo puede ocultarlo o bloquear acciones relacionadas.
        </li>
        <li>
          Declaras que tu fecha de nacimiento es verdadera. Falsificar la edad
          puede implicar suspensión o baja de la cuenta.
        </li>
      </ul>

      <h2>3. Tu responsabilidad como usuario</h2>
      <ul>
        <li>Usar TraGo de forma lícita y respetuosa.</li>
        <li>
          No publicar reseñas falsas, spam ni datos de terceros sin
          consentimiento.
        </li>
        <li>
          Verificar en el local precios, horarios, existencias y requisitos
          (identificación, consumo mínimo, etc.).
        </li>
        <li>
          Si eres padre, madre o tutor de un menor con cuenta TraGo, supervisas
          su uso.
        </li>
      </ul>

      <h2>4. Negocios y promociones</h2>
      <p>
        Los comercios y cadenas que publiquen en TraGo son responsables de la
        veracidad, legalidad y cumplimiento de sus ofertas. TraGo puede retirar
        contenido reportado como caduco, engañoso o ilegal, sin obligación de
        indemnizar.
      </p>

      <h2>5. Puntos, cupones, favoritos e insignias</h2>
      <p>
        Los puntos y cupones son beneficios del programa de lealtad de TraGo,
        sin valor monetario fuera de la plataforma salvo lo que indique cada
        promoción. Pueden modificarse o cancelarse ante abuso o cambios del
        servicio. Tus <strong>favoritos</strong> se guardan en tu dispositivo
        para consultarlos sin conexión; eres responsable de no almacenar datos
        sensibles ajenos.
      </p>

      <h2>6. Limitación de responsabilidad</h2>
      <p>
        En la medida permitida por la ley, TraGo no responde por daños derivados
        de: (a) información desactualizada de terceros; (b) negativa de un
        comercio a aplicar una promo; (c) uso indebido de la geolocalización;
        (d) interrupciones de red, hosting o del dispositivo del usuario.
      </p>

      <h2>7. Propiedad intelectual</h2>
      <p>
        La marca TraGo, su diseño y el software del servicio son propiedad de
        TraGo o de sus licenciantes. Las marcas de terceros (cadenas y
        comercios) pertenecen a sus respectivos titulares.
      </p>

      <h2>8. Cambios y contacto</h2>
      <p>
        Podemos actualizar estos términos. La versión vigente estará siempre en
        esta página. Para dudas legales o de soporte:{' '}
        <a href="mailto:hola@trago.app">hola@trago.app</a>.
      </p>

      <p>
        También aplica el{' '}
        <Link to="/aviso-de-privacidad">Aviso de privacidad</Link>.
      </p>

      <p className="muted legal-back">
        <Link to="/">← Volver al inicio</Link>
      </p>
    </article>
  );
}
