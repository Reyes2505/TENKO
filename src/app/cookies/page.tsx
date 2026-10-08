export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-[#0b0b0e] text-neutral-300 py-12 px-6">
      <div className="max-w-4xl mx-auto space-y-8 text-xs sm:text-sm leading-relaxed">
        
        {/* Cabecera */}
        <div className="border-b border-neutral-800 pb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Política de Cookies
          </h1>
          <p className="text-neutral-500 text-xs mt-1">Última actualización: Octubre de 2026</p>
        </div>

        {/* Sección 1 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-white">1. ¿Qué son las Cookies y tecnologías similares?</h2>
          <p>
            Las cookies son pequeños ficheros de datos que se descargan en el navegador del usuario al acceder a determinadas páginas web. <strong>TENKO AI</strong> utiliza tanto cookies propias como almacenamiento local del navegador (<em>localStorage</em>) para optimizar la experiencia de navegación, recordar credenciales de sesión y gestionar preferencias multimedia.
          </p>
        </section>

        {/* Sección 2 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-white">2. Tipos de Cookies que utilizamos</h2>
          <div className="space-y-3 text-neutral-400">
            <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800">
              <strong className="text-white block mb-1">Cookies Técnicas y de Sesión (Estrictamente Necesarias)</strong>
              Permiten el funcionamiento del sistema de autenticación (Supabase Auth), manteniendo la sesión abierta de forma segura mientras navegas por la web y la sección de perfil.
            </div>
            <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800">
              <strong className="text-white block mb-1">Cookies de Preferencias y Configuración</strong>
              Almacenan configuraciones personalizadas del usuario, tales como el modo de visualización (Tema Claro / Oscuro) y las preferencias de reproducción de audio en los banners y avatares.
            </div>
            <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800">
              <strong className="text-white block mb-1">Cookies Analíticas y Publicitarias (Futuras)</strong>
              Utilizadas opcionalmente para medir el tráfico general de la plataforma y permitir en el futuro la gestión de anuncios personalizados no intrusivos gestionados por redes publicitarias asociadas.
            </div>
          </div>
        </section>

        {/* Sección 3 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-white">3. Consentimiento y Gestión de Cookies</h2>
          <p>
            Al hacer clic en el botón "Aceptar y continuar" del banner de consentimiento o al continuar navegando en TENKO AI, el usuario otorga su consentimiento expreso para el uso de las cookies descritas. El usuario puede configurar en cualquier momento su navegador (Chrome, Firefox, Safari, Edge) para rechazar o eliminar las cookies almacenadas; sin embargo, bloquear las cookies técnicas esenciales puede impedir el inicio de sesión correcto en la plataforma.
          </p>
        </section>

      </div>
    </main>
  );
}
