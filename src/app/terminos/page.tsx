import Link from "next/link";

export default function TerminosPage() {
  return (
    <main className="min-h-screen bg-[#0b0b0e] text-neutral-300 py-12 px-6 sm:px-12 selection:bg-purple-500 selection:text-white">
      <div className="max-w-4xl mx-auto space-y-10 text-xs sm:text-sm leading-relaxed">
        
        {/* Cabecera */}
        <div className="border-b border-neutral-800 pb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2">
            Términos y Condiciones de Uso
          </h1>
          <p className="text-neutral-500 text-xs uppercase tracking-wider font-bold">Última actualización: Octubre de 2026</p>
        </div>

        {/* Sección 1 */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white">1. Introducción y Aceptación de los Términos</h2>
          <p>
            Bienvenido a <strong>TENKO (TENKO天気)</strong>. El acceso y uso de esta plataforma, sus servicios, aplicaciones y herramientas (en adelante, el "Servicio") están sujetos a los presentes Términos y Condiciones. Al acceder, navegar, registrarse o utilizar cualquier función de TENKO, usted acepta estar legalmente vinculado por estos términos en su totalidad, así como por nuestra <Link href="/cookies" className="text-purple-400 hover:underline">Política de Cookies</Link> y Privacidad. Si no está de acuerdo con alguna parte de estos términos, debe abstenerse de utilizar el Servicio.
          </p>
        </section>

        {/* Sección 2 - CRUCIAL SAFE HARBOR */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white">2. Naturaleza del Servicio y Política de No Alojamiento (Safe Harbor)</h2>
          <p>
            TENKO opera estrictamente como una interfaz web y un agregador social. Nuestra plataforma permite a los usuarios sincronizar y visualizar contenido a través de integraciones de terceros.
          </p>
          <div className="p-5 rounded-xl bg-neutral-900 border-l-4 border-purple-500 text-neutral-200">
            <p className="uppercase tracking-wider text-[11px] text-purple-400 font-black mb-2">Aviso Legal sobre Contenido Multimedia:</p>
            TENKO <strong>no aloja, no almacena, no transfiere, no codifica ni distribuye</strong> ningún tipo de archivo multimedia (incluyendo, pero sin limitarse a, videos MP4, streams HLS, archivos de audio o imágenes protegidas) en sus propios servidores. Todo el contenido audiovisual visualizado en la sección de "Shorts" o en los perfiles de usuario proviene de incrustaciones de terceros (embeds) o interfaces de programación de aplicaciones (API) externas.
          </div>
          <p>
            La responsabilidad sobre la legalidad, los derechos de autor y la naturaleza de dicho contenido recae de manera exclusiva en las plataformas de origen donde dichos archivos están físicamente almacenados y en el usuario que decide vincularlos.
          </p>
        </section>

        {/* Sección 3 */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white">3. Integración con Terceros y Autenticación</h2>
          <p>
            El Servicio permite la vinculación y autenticación mediante plataformas de terceros. Al utilizar la función "Continuar con..." u otorgar permisos de acceso, usted comprende y acepta que:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-neutral-400">
            <li>TENKO actuará únicamente como una capa de personalización (wrapper) y lectura de datos públicos autorizados por usted.</li>
            <li>El uso de estas integraciones está sujeto a los términos de servicio, políticas de privacidad y directrices de la plataforma de origen correspondiente.</li>
            <li>Cualquier revocación de acceso a la cuenta de terceros deberá ser gestionada directamente desde la configuración de seguridad de dicha plataforma.</li>
          </ul>
        </section>

        {/* Sección 4 */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white">4. Propiedad Intelectual y Notificaciones de Infracción</h2>
          <p>
            TENKO respeta plenamente los derechos de propiedad intelectual de terceros bajo los estándares y normativas internacionales de derechos de autor. Dado que actuamos como un mero conducto de información (Safe Harbor):
          </p>
          <ul className="list-disc pl-5 space-y-2 text-neutral-400">
            <li>Si usted es titular de derechos de autor y cree de buena fe que algún enlace indexado en TENKO infringe sus derechos, puede enviar una notificación formal de retiro (Takedown Notice) a nuestro equipo de soporte.</li>
            <li>Tras la verificación, procederemos diligentemente a la desvinculación, bloqueo o eliminación del enlace de nuestro índice, sin que esto implique la eliminación del archivo del servidor de origen (el cual no controlamos).</li>
          </ul>
        </section>

        {/* Sección 5 */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white">5. Conducta del Usuario y Contenido Generado por la Comunidad (UGC)</h2>
          <p>
            Los usuarios son los únicos responsables de cualquier texto, comentario, biografía o enlace que compartan en TENKO. Queda estrictamente prohibido utilizar la plataforma para:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-neutral-400">
            <li>Fomentar el discurso de odio, discriminación, violencia o acoso sistemático contra cualquier individuo o grupo.</li>
            <li>Distribuir software malicioso, spam, esquemas fraudulentos o enlaces de phishing.</li>
            <li>Incurrir en suplantación de identidad (impersonation) de creadores, estudios de animación, o personal de TENKO.</li>
          </ul>
          <p>TENKO se reserva el derecho unilateral de suspender, limitar o eliminar de manera permanente cualquier cuenta que infrinja estas normas de convivencia, sin obligación de notificación previa.</p>
        </section>

        {/* Sección 6 */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white">6. Limitación de Responsabilidad y Exención de Garantías</h2>
          <p>
            El Servicio de TENKO se proporciona "tal cual" (AS IS) y "según disponibilidad". En la medida máxima permitida por las leyes aplicables a nivel internacional, TENKO, sus desarrolladores, directores y afiliados renuncian a cualquier garantía expresa o implícita relacionada con el rendimiento de la web, la disponibilidad ininterrumpida, o la exactitud del contenido mostrado.
          </p>
          <p>
            TENKO no será responsable por daños directos, indirectos, incidentales o consecuentes (incluida la pérdida de datos o interrupción del uso) que deriven del uso de la plataforma o de la incapacidad para acceder a servicios de terceros integrados.
          </p>
        </section>

        {/* Sección 7 */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white">7. Jurisdicción, Resolución de Disputas y Modificaciones</h2>
          <p>
            Cualquier disputa derivada o relacionada con estos términos y el uso de TENKO se interpretará y resolverá de acuerdo con las leyes aplicables de la jurisdicción competente en la que se registre la entidad legal operadora del sitio, excluyendo conflictos de principios legales.
          </p>
          <p>
            Nos reservamos el derecho de modificar estos Términos y Condiciones en cualquier momento para reflejar cambios legales, técnicos o comerciales. Las actualizaciones entrarán en vigor en el momento de su publicación. Es responsabilidad del usuario revisar periódicamente esta página. El uso continuado del sitio constituirá la aceptación irrevocable de los términos modificados.
          </p>
        </section>

      </div>
    </main>
  );
}
