export type Locale = 'es' | 'en';

export interface PolicySection {
  title: string;
  body: (string | { list: string[] } | { table: { headers: string[]; rows: string[][] } })[];
}

export interface PolicyContent {
  title: string;
  lastUpdated: string;
  sections: PolicySection[];
  footerNote: string;
}

export const cookiePolicy: Record<Locale, PolicyContent> = {
  es: {
    title: 'Política de Cookies y Tecnologías de Rastreo',
    lastUpdated: 'Última actualización: Octubre de 2026',
    sections: [
      {
        title: '1. ¿Qué son las Cookies y tecnologías similares?',
        body: [
          'Para garantizar el correcto funcionamiento de TENKO, utilizamos tecnologías de almacenamiento de datos en su dispositivo. Las "cookies" son pequeños fragmentos de texto enviados por su navegador web a un sitio que usted visita. Asimismo, utilizamos tecnologías análogas como el almacenamiento local (localStorage) y el almacenamiento de sesión de HTML5.',
          'Estas herramientas permiten que la plataforma reconozca su dispositivo, recuerde sus preferencias en visitas posteriores, y mantenga los estándares de seguridad necesarios durante la navegación.',
        ],
      },
      {
        title: '2. Categorías de Tecnologías Utilizadas',
        body: [
          'A. Tecnologías Estrictamente Necesarias (Técnicas)',
          'Son indispensables para que la web funcione correctamente. Incluyen el almacenamiento de tokens de acceso seguro, la gestión del estado de autenticación (para mantener su sesión iniciada) y la prevención de vulnerabilidades o accesos no autorizados a su cuenta. Sin estas tecnologías, el uso de perfiles y funciones sociales en TENKO sería imposible.',
          'B. Tecnologías de Preferencias y Personalización',
          'Utilizamos el localStorage de su navegador para recordar decisiones de interfaz de usuario. Por ejemplo: si prefiere el "Modo Oscuro" o "Modo Claro", si ha silenciado el volumen de los reproductores de Shorts, y el caché temporal de avatares para acelerar la carga visual de la página.',
          'C. Cookies de Analítica y Publicidad (Integraciones Futuras)',
          'Para asegurar la gratuidad y el desarrollo de la plataforma, TENKO puede integrar eventualmente cookies de redes de análisis y servicios de terceros. Estas herramientas procesan datos estadísticos agregados y de manera anónima (interacciones, tiempo de retención, clics) para ayudarnos a entender qué contenido disfruta la comunidad y mostrar anuncios relevantes.',
          {
            table: {
              headers: ['Categoría', 'Finalidad', 'Requiere consentimiento'],
              rows: [
                ['Estrictamente necesarias', 'Sesión, seguridad, autenticación', 'No'],
                ['Preferencias', 'Modo oscuro/claro, volumen, caché visual', 'Recomendado'],
                ['Analítica', 'Métricas agregadas y anónimas', 'Sí'],
                ['Publicidad', 'Anuncios personalizados (futuro)', 'Sí'],
              ],
            },
          },
        ],
      },
      {
        title: '3. Proveedores de Terceros (Autenticación Externa)',
        body: [
          'Al utilizar las funciones de inicio de sesión mediante plataformas de terceros, dichas empresas externas pueden depositar cookies en su navegador o utilizar tecnologías de rastreo mediante el protocolo OAuth/PKCE. Estas transferencias de datos técnicos (como el code_verifier o tokens de intercambio) se realizan estrictamente con fines de validación criptográfica y autenticación.',
          'TENKO no tiene control directo sobre las cookies depositadas por estos proveedores en sus respectivos dominios. Le recomendamos leer las políticas de privacidad de dichas plataformas externas.',
        ],
      },
      {
        title: '4. Gestión de su Consentimiento y Configuración',
        body: [
          'De conformidad con los estándares de privacidad internacionales, usted tiene el derecho de gestionar, bloquear o eliminar las cookies en cualquier momento.',
          {
            list: [
              'Aceptación inicial: al continuar navegando en nuestra web tras visualizar el aviso de cookies, usted otorga su consentimiento implícito para el uso de las tecnologías descritas.',
              'Configuración del Navegador: la mayoría de los navegadores (Chrome, Firefox, Safari, Edge, Brave) permiten acceder a los ajustes de privacidad para bloquear cookies de terceros o borrar el almacenamiento local.',
              'Advertencia: si usted desactiva o elimina las cookies estrictamente necesarias, se cerrará su sesión de TENKO inmediatamente y ciertas funcionalidades interactivas (como guardar favoritos, dar Me Gusta o comentar) dejarán de estar operativas.',
            ],
          },
        ],
      },
      {
        title: '5. Actualizaciones de esta Política',
        body: [
          'Nos reservamos el derecho de modificar esta Política de Cookies para reflejar cambios legales, técnicos o comerciales. Las actualizaciones entrarán en vigor en el momento de su publicación. El uso continuado del sitio constituirá la aceptación de la versión vigente.',
        ],
      },
    ],
    footerNote:
      'Al continuar navegando en TENKO AI, aceptas nuestra Política de Cookies y nuestros Términos y Condiciones.',
  },

  en: {
    title: 'Cookie Policy and Tracking Technologies',
    lastUpdated: 'Last updated: October 2026',
    sections: [
      {
        title: '1. What are Cookies and similar technologies?',
        body: [
          'To ensure the proper functioning of TENKO, we use data storage technologies on your device. "Cookies" are small text fragments sent by your web browser to a site you visit. We also use analogous technologies such as local storage (localStorage) and HTML5 session storage.',
          'These tools allow the platform to recognize your device, remember your preferences on subsequent visits, and maintain the necessary security standards during browsing.',
        ],
      },
      {
        title: '2. Categories of Technologies Used',
        body: [
          'A. Strictly Necessary Technologies (Technical)',
          'These are essential for the website to function properly. They include secure access token storage, authentication state management (to keep you logged in), and prevention of vulnerabilities or unauthorized access to your account. Without these technologies, the use of profiles and social features on TENKO would be impossible.',
          'B. Preference and Personalization Technologies',
          'We use your browser\'s localStorage to remember user interface decisions. For example: whether you prefer "Dark Mode" or "Light Mode", whether you have muted the volume of Shorts players, and the temporary avatar cache to speed up page visual loading.',
          'C. Analytics and Advertising Cookies (Future Integrations)',
          'To ensure the platform remains free and continues to develop, TENKO may eventually integrate cookies from analytics networks and third-party services. These tools process aggregated and anonymized statistical data (interactions, retention time, clicks) to help us understand what content the community enjoys and to show relevant ads.',
          {
            table: {
              headers: ['Category', 'Purpose', 'Requires consent'],
              rows: [
                ['Strictly necessary', 'Session, security, authentication', 'No'],
                ['Preferences', 'Dark/light mode, volume, visual cache', 'Recommended'],
                ['Analytics', 'Aggregated and anonymized metrics', 'Yes'],
                ['Advertising', 'Personalized ads (future)', 'Yes'],
              ],
            },
          },
        ],
      },
      {
        title: '3. Third-Party Providers (External Authentication)',
        body: [
          'When using third-party login features, these external companies may deposit cookies in your browser or use tracking technologies via the OAuth/PKCE protocol. These technical data transfers (such as the code_verifier or exchange tokens) are carried out strictly for cryptographic validation and authentication purposes.',
          'TENKO has no direct control over cookies deposited by these providers on their respective domains. We recommend reading the privacy policies of these external platforms.',
        ],
      },
      {
        title: '4. Managing Your Consent and Configuration',
        body: [
          'In accordance with international privacy standards, you have the right to manage, block, or delete cookies at any time.',
          {
            list: [
              'Initial acceptance: by continuing to browse our website after viewing the cookie notice, you grant your implicit consent for the use of the technologies described.',
              'Browser Settings: most browsers (Chrome, Firefox, Safari, Edge, Brave) allow you to access privacy settings to block third-party cookies or clear local storage.',
              'Warning: if you disable or delete strictly necessary cookies, your TENKO session will be closed immediately and certain interactive features (such as saving favorites, liking, or commenting) will stop working.',
            ],
          },
        ],
      },
      {
        title: '5. Updates to this Policy',
        body: [
          'We reserve the right to modify this Cookie Policy to reflect legal, technical, or commercial changes. Updates take effect upon publication. Continued use of the site constitutes acceptance of the current version.',
        ],
      },
    ],
    footerNote:
      'By continuing to browse TENKO AI, you accept our Cookie Policy and our Terms and Conditions.',
  },
};
