export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-[#0b0b0e] text-neutral-300 py-12 px-6 sm:px-12 selection:bg-purple-500 selection:text-white">
      <div className="max-w-4xl mx-auto space-y-10 text-xs sm:text-sm leading-relaxed">
        
        {/* Cabecera */}
        <div className="border-b border-neutral-800 pb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2">
            Política de Cookies y Tecnologías de Rastreo
          </h1>
          <p className="text-neutral-500 text-xs uppercase tracking-wider font-bold">Última actualización: Octubre de 2026</p>
        </div>

        {/* Sección 1 */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white">1. ¿Qué son las Cookies y tecnologías similares?</h2>
          <p>
            Para garantizar el correcto funcionamiento de <strong>TENKO</strong>, utilizamos tecnologías de almacenamiento de datos en su dispositivo. Las "cookies" son pequeños fragmentos de texto enviados por su navegador web a un sitio que usted visita. Asimismo, utilizamos tecnologías análogas como el <strong>almacenamiento local (localStorage)</strong> y el almacenamiento de sesión de HTML5.
          </p>
          <p>
            Estas herramientas permiten que la plataforma reconozca su dispositivo, recuerde sus preferencias en visitas posteriores, y mantenga los estándares de seguridad necesarios durante la navegación.
          </p>
        </section>

        {/* Sección 2 */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white">2. Categorías de Tecnologías Utilizadas</h2>
          <p>En TENKO clasificamos las cookies y el almacenamiento de datos en las siguientes categorías:</p>
          
          <div className="space-y-4 text-neutral-400 mt-4">
            <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 transition hover:border-neutral-700">
              <strong className="text-white block mb-2 text-base">A. Tecnologías Estrictamente Necesarias (Técnicas)</strong>
              Son indispensables para que la web funcione correctamente. Incluyen el almacenamiento de tokens de acceso seguro, la gestión del estado de autenticación (para mantener su sesión iniciada) y la prevención de vulnerabilidades o accesos no autorizados a su cuenta. Sin estas tecnologías, el uso de perfiles y funciones sociales en TENKO sería imposible.
            </div>
            
            <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 transition hover:border-neutral-700">
              <strong className="text-white block mb-2 text-base">B. Tecnologías de Preferencias y Personalización</strong>
              Utilizamos el <em>localStorage</em> de su navegador para recordar decisiones de interfaz de usuario. Por ejemplo: si prefiere el "Modo Oscuro" o "Modo Claro", si ha silenciado el volumen de los reproductores de Shorts, y el caché temporal de avatares para acelerar la carga visual de la página.
            </div>
            
            <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 transition hover:border-neutral-700">
              <strong className="text-white block mb-2 text-base">C. Cookies de Analítica y Publicidad (Integraciones Futuras)</strong>
              Para asegurar la gratuidad y el desarrollo de la plataforma, TENKO puede integrar eventualmente cookies de redes de análisis y servicios de terceros. Estas herramientas procesan datos estadísticos agregados y de manera anónima (interacciones, tiempo de retención, clics) para ayudarnos a entender qué contenido disfruta la comunidad y mostrar anuncios relevantes.
            </div>
          </div>
        </section>

        {/* Sección 3 */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white">3. Proveedores de Terceros (Autenticación Externa)</h2>
          <p>
            Al utilizar las funciones de inicio de sesión mediante plataformas de terceros, dichas empresas externas pueden depositar cookies en su navegador o utilizar tecnologías de rastreo mediante el protocolo OAuth/PKCE. Estas transferencias de datos técnicos (como el <code>code_verifier</code> o tokens de intercambio) se realizan estrictamente con fines de validación criptográfica y autenticación.
          </p>
          <p>
            TENKO no tiene control directo sobre las cookies depositadas por estos proveedores en sus respectivos dominios. Le recomendamos leer las políticas de privacidad de dichas plataformas externas.
          </p>
        </section>

        {/* Sección 4 */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white">4. Gestión de su Consentimiento y Configuración</h2>
          <p>
            De conformidad con los estándares de privacidad internacionales, usted tiene el derecho de gestionar, bloquear o eliminar las cookies en cualquier momento. 
          </p>
          <ul className="list-disc pl-5 space-y-2 text-neutral-400">
            <li><strong>Aceptación inicial:</strong> Al continuar navegando en nuestra web tras visualizar el aviso de cookies, usted otorga su consentimiento implícito para el uso de las tecnologías descritas.</li>
            <li><strong>Configuración del Navegador:</strong> La mayoría de los navegadores (Chrome, Firefox, Safari, Edge, Brave) permiten acceder a los ajustes de privacidad para bloquear cookies de terceros o borrar el almacenamiento local (borrar historial y datos del sitio).</li>
          </ul>
          <p className="text-amber-400 font-medium">
            Advertencia: Si usted desactiva o elimina las cookies estrictamente necesarias, se cerrará su sesión de TENKO inmediatamente y ciertas funcionalidades interactivas (como guardar favoritos, dar Me Gusta o comentar) dejarán de estar operativas.
          </p>
        </section>

      </div>
    </main>
  );
}
