export default function TerminosPage() {
  return (
    <main className="min-h-screen bg-[#0b0b0e] text-neutral-300 py-12 px-6">
      <div className="max-w-4xl mx-auto space-y-8 text-xs sm:text-sm leading-relaxed">
        
        {/* Cabecera */}
        <div className="border-b border-neutral-800 pb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Términos y Condiciones de Uso y Aviso Legal
          </h1>
          <p className="text-neutral-500 text-xs mt-1">Última actualización: Octubre de 2026</p>
        </div>

        {/* Sección 1 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-white">1. Naturaleza del Servicio y No Alojamiento de Contenido (Safe Harbor)</h2>
          <p>
            <strong>TENKO AI (TENKO天気)</strong> opera estrictamente como una plataforma web comunitaria de indexación, visualización y software de interfaz social. 
          </p>
          <div className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800 text-neutral-200 font-medium">
            <p className="uppercase tracking-wider text-[11px] text-purple-400 font-black mb-1">Aviso Importante de Servidores:</p>
            La plataforma <strong>NO aloja, almacena, sube, distribuye ni controla</strong> ningún archivo multimedia, fichero de video (MP4, HLS, etc.), pistas de audio o material protegido por derechos de autor en sus servidores propios. Todos los contenidos visualizados en la sección de <em>Shorts</em> o perfiles provienen de enlaces públicos externos, incrustaciones (embeds) de terceros o son aportados de forma independiente por los usuarios bajo su absoluta y exclusiva responsabilidad en calidad de Contenido Generado por el Usuario (UGC).
          </div>
        </section>

        {/* Sección 2 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-white">2. Propiedad Intelectual y Política de Retirada (DMCA / Indecopi)</h2>
          <p>
            TENKO AI respeta rigurosamente los derechos de propiedad intelectual. En cumplimiento con la legislación de la República del Perú (Decreto Legislativo N° 822 - Ley sobre el Derecho de Autor) y normativas internacionales de protección de derechos de autor:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-neutral-400">
            <li>Si usted es titular de derechos de autor o un representante autorizado y considera que algún enlace o contenido indexado infringe sus derechos, puede notificarlo inmediatamente a través de nuestros canales de contacto.</li>
            <li>Al recibir una notificación formal y fundamentada, TENKO AI procederá de manera inmediata a la desactivación o eliminación del enlace infractor de su índice en un plazo razonable (Notice and Takedown).</li>
          </ul>
        </section>

        {/* Sección 3 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-white">3. Responsabilidad del Usuario (UGC)</h2>
          <p>
            Los usuarios registrados que utilicen las funciones de perfil, avatares, banners, comentarios o publicaciones garantizan que poseen los derechos o autorizaciones necesarias sobre los enlaces y textos que comparten. Queda terminantemente prohibido el uso de la plataforma para difundir material ilícito, software malicioso, acoso o infracciones graves de copyright. TENKO AI se reserva el derecho de suspender cuentas infractoras sin previo aviso.
          </p>
        </section>

        {/* Sección 4 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-white">4. Exención de Garantías y Limitación de Responsabilidad</h2>
          <p>
            El servicio se proporciona "tal cual" y "según disponibilidad". TENKO AI no otorga garantías, expresas o implícitas, sobre la disponibilidad continua del servicio, exactitud de enlaces externos proporcionados por terceros o la ausencia de errores técnicos. La plataforma no asume ninguna responsabilidad civil o penal por el uso indebido que los usuarios hagan de las herramientas del sitio.
          </p>
        </section>

        {/* Sección 5 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-white">5. Monetización y Publicidad</h2>
          <p>
            Para garantizar la sostenibilidad operativa de la plataforma a costo cero para sus usuarios fundadores, TENKO AI podrá incorporar en el futuro espacios publicitarios, enlaces patrocinados o banners comerciales de terceros. La visualización de dichos anuncios se rige por las políticas de privacidad de los proveedores correspondientes.
          </p>
        </section>

        {/* Sección 6 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-white">6. Legislación y Jurisdicción Aplicable</h2>
          <p>
            Para cualquier controversia legal o administrativa derivada del uso de TENKO AI, las partes se someten expresamente a la jurisdicción de los tribunales y autoridades competentes de la ciudad de Lima, Perú, renunciando a cualquier otro fuero.
          </p>
        </section>

      </div>
    </main>
  );
}
