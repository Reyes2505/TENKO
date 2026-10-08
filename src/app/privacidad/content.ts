// src/app/privacidad/content.ts

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

export const privacyPolicy: Record<Locale, PolicyContent> = {
  es: {
    title: 'Política de Privacidad',
    lastUpdated: 'Última actualización: Octubre de 2026',
    sections: [
      {
        title: '1. Introducción y Alcance',
        body: [
          'Bienvenido a TENKO (TENKO天気). La presente Política de Privacidad describe cómo recopilamos, utilizamos, almacenamos, compartimos y protegemos su información personal cuando utiliza nuestra plataforma, sitio web, aplicaciones y servicios (en adelante, el "Servicio").',
          'Esta Política se ha redactado en cumplimiento de los estándares internacionales de protección de datos, incluyendo el Reglamento General de Protección de Datos (RGPD) de la Unión Europea, los Principios de Privacidad de la OCDE, los Principios de Protección de Datos Personales de la OEA, y las leyes aplicables de protección al consumidor en las jurisdicciones donde operamos.',
          'Al acceder o utilizar el Servicio, usted acepta las prácticas descritas en esta Política. Si no está de acuerdo, debe abstenerse de utilizar TENKO.',
        ],
      },
      {
        title: '2. Responsable del Tratamiento',
        body: [
          'Para los fines del RGPD y normativas equivalentes, el responsable del tratamiento de sus datos personales es:',
          'TENKO (TENKO天気) — Correo de contacto: [pendiente de definir] — Jurisdicción de registro: [pendiente de definir]',
        ],
      },
      {
        title: '3. Datos Personales que Recopilamos',
        body: [
          '3.1 Datos que usted nos proporciona directamente',
          {
            table: {
              headers: ['Categoría', 'Ejemplos', 'Finalidad'],
              rows: [
                ['Datos de cuenta', 'Nombre de usuario, correo, contraseña cifrada', 'Autenticación y gestión'],
                ['Datos de perfil', 'Avatar, biografía, preferencias', 'Personalización'],
                ['Contenido UGC', 'Comentarios, textos, enlaces', 'Interacción social'],
                ['Preferencias', 'Modo claro/oscuro, volumen', 'Persistencia'],
              ],
            },
          },
          '3.2 Datos recopilados automáticamente',
          {
            table: {
              headers: ['Categoría', 'Ejemplos', 'Finalidad'],
              rows: [
                ['Datos técnicos', 'IP, navegador, SO, identificadores', 'Seguridad y funcionalidad'],
                ['Datos de uso', 'Páginas, retención, interacciones', 'Analítica agregada'],
                ['Cookies y storage', 'Tokens, tema, caché de avatares', 'Funcionalidad y personalización'],
              ],
            },
          },
          '3.3 Datos provenientes de terceros (autenticación externa)',
          'Cuando utiliza funciones de inicio de sesión mediante plataformas de terceros (TikTok, Google), podemos recibir: identificador de usuario, nombre público y avatar, correo electrónico (si lo autoriza), y lista de videos públicos (si lo autoriza). El tratamiento se limita estrictamente a la sincronización y visualización dentro de TENKO, actuando como capa de personalización (wrapper).',
        ],
      },
      {
        title: '4. Bases Legales para el Tratamiento',
        body: [
          {
            table: {
              headers: ['Base Legal', 'Aplicación en TENKO'],
              rows: [
                ['Ejecución de un contrato', 'Gestión de cuenta, autenticación, prestación del Servicio'],
                ['Consentimiento', 'Cookies de analítica y publicidad, sincronización con terceros'],
                ['Interés legítimo', 'Seguridad, prevención de fraude, mejora del Servicio'],
                ['Cumplimiento legal', 'Conservación requerida por ley, respuesta a autoridades'],
              ],
            },
          },
        ],
      },
      {
        title: '5. Finalidades del Tratamiento',
        body: [
          {
            list: [
              'Proporcionar y mantener el Servicio: autenticación, perfiles, visualización.',
              'Personalizar su experiencia: recordar preferencias, sugerir contenido.',
              'Garantizar la seguridad: detectar accesos no autorizados, spam y fraude.',
              'Mejorar el Servicio: analizar patrones de uso de forma agregada y anónima.',
              'Cumplir obligaciones legales: responder a autoridades competentes.',
              'Comunicaciones relacionadas con el Servicio (no comerciales sin consentimiento).',
            ],
          },
        ],
      },
      {
        title: '6. Conservación de Datos',
        body: [
          {
            table: {
              headers: ['Tipo de dato', 'Período de conservación'],
              rows: [
                ['Datos de cuenta activa', 'Mientras la cuenta permanezca activa'],
                ['Datos de cuenta inactiva', 'Hasta 24 meses tras la última actividad'],
                ['Registros de seguridad', 'Hasta 12 meses'],
                ['Comentarios y UGC', 'Hasta eliminación por usuario o moderación'],
                ['Tokens de autenticación', 'Hasta expiración o revocación'],
              ],
            },
          },
        ],
      },
      {
        title: '7. Compartición de Datos',
        body: [
          '7.1 Terceros proveedores de servicios: Supabase (auth, DB), Vercel (hosting), proveedores de autenticación externa (TikTok, Google).',
          '7.2 Transferencias internacionales: sus datos pueden procesarse en EE.UU. Para transferencias desde el EEE, aplicamos Cláusulas Contractuales Tipo (SCC) aprobadas por la Comisión Europea.',
          '7.3 Autoridades legales: podemos divulgar datos cuando sea requerido por ley u orden judicial.',
          '7.4 No venta de datos: TENKO no vende, alquila ni comercializa sus datos personales.',
        ],
      },
      {
        title: '8. Sus Derechos',
        body: [
          {
            table: {
              headers: ['Derecho', 'Descripción'],
              rows: [
                ['Acceso', 'Confirmar si tratamos sus datos y acceder a ellos.'],
                ['Rectificación', 'Corregir datos inexactos o incompletos.'],
                ['Supresión', 'Solicitar eliminación cuando no exista base legal.'],
                ['Limitación', 'Restringir el uso en determinadas circunstancias.'],
                ['Portabilidad', 'Recibir sus datos en formato estructurado.'],
                ['Oposición', 'Oponerse al tratamiento por interés legítimo.'],
                ['Retirada del consentimiento', 'Revocar en cualquier momento sin afectar licitud previa.'],
              ],
            },
          },
          'Para ejercer estos derechos, contáctenos en: [correo de privacidad pendiente]. Responderemos dentro de los plazos legales aplicables.',
        ],
      },
      {
        title: '9. Seguridad de los Datos',
        body: [
          {
            list: [
              'Cifrado de datos en tránsito (HTTPS/TLS).',
              'Cifrado de contraseñas con algoritmos seguros.',
              'Autenticación mediante tokens de acceso seguro.',
              'Protocolo PKCE para flujos OAuth.',
              'Acceso restringido a datos personales.',
              'Auditorías periódicas de seguridad.',
            ],
          },
          'Ningún sistema es completamente seguro. No podemos garantizar la seguridad absoluta de la información transmitida por Internet.',
        ],
      },
      {
        title: '10. Cookies y Tecnologías de Rastreo',
        body: [
          'El uso de cookies se rige por nuestra Política de Cookies, parte integral de esta Política. Categorías: estrictamente necesarias (sin consentimiento), preferencias (gestionables), analítica y publicidad (solo con consentimiento explícito).',
        ],
      },
      {
        title: '11. Menores de Edad',
        body: [
          'El Servicio no está dirigido a menores de 16 años. No recopilamos conscientemente datos de menores. Si detectamos tal situación, procederemos a su eliminación.',
        ],
      },
      {
        title: '12. Cambios a esta Política',
        body: [
          'Nos reservamos el derecho de modificar esta Política. Las actualizaciones entran en vigor al publicarse. Notificaremos cambios significativos mediante aviso destacado o correo. El uso continuado constituye aceptación.',
        ],
      },
      {
        title: '13. Contacto y Autoridades de Control',
        body: [
          'Correo de privacidad: [pendiente] — Correo de soporte: [pendiente]. Si considera que el tratamiento vulnera la normativa, puede reclamar ante la autoridad de control de su jurisdicción (ej. AEPD en España).',
        ],
      },
      {
        title: '14. Disposiciones Específicas por Jurisdicción',
        body: [
          '14.1 EEE: derechos reconocidos por el RGPD, incluido el de reclamar ante la autoridad de control.',
          '14.2 California (CCPA/CPRA): derecho a saber, eliminar, optar por no participar en venta (TENKO no vende), corregir, limitar datos sensibles y no ser discriminado.',
          '14.3 América Latina: derechos de acceso, rectificación, cancelación y oposición conforme a los Principios de la OEA y leyes nacionales.',
        ],
      },
    ],
    footerNote:
      'Al continuar navegando en TENKO AI, aceptas nuestra Política de Privacidad y nuestros Términos y Condiciones.',
  },

  en: {
    title: 'Privacy Policy',
    lastUpdated: 'Last updated: October 2026',
    sections: [
      {
        title: '1. Introduction and Scope',
        body: [
          'Welcome to TENKO (TENKO天気). This Privacy Policy describes how we collect, use, store, share, and protect your personal information when you use our platform, website, applications, and services (the "Service").',
          'This Policy has been drafted in compliance with international data protection standards, including the GDPR (EU), the OECD Privacy Principles, the OAS Principles on Personal Data Protection, and applicable consumer protection laws.',
          'By accessing or using the Service, you agree to the practices described in this Policy. If you do not agree, you must refrain from using TENKO.',
        ],
      },
      {
        title: '2. Data Controller',
        body: [
          'For the purposes of the GDPR and equivalent regulations, the data controller is:',
          'TENKO (TENKO天気) — Contact email: [pending] — Jurisdiction of registration: [pending]',
        ],
      },
      {
        title: '3. Personal Data We Collect',
        body: [
          '3.1 Data You Provide Directly',
          {
            table: {
              headers: ['Category', 'Examples', 'Purpose'],
              rows: [
                ['Account data', 'Username, email, encrypted password', 'Authentication and management'],
                ['Profile data', 'Avatar, biography, preferences', 'Personalization'],
                ['User-generated content', 'Comments, texts, links', 'Social interaction'],
                ['Preferences', 'Dark/light mode, volume', 'Persistence'],
              ],
            },
          },
          '3.2 Data Collected Automatically',
          {
            table: {
              headers: ['Category', 'Examples', 'Purpose'],
              rows: [
                ['Technical data', 'IP, browser, OS, identifiers', 'Security and functionality'],
                ['Usage data', 'Pages, retention, interactions', 'Aggregate analytics'],
                ['Cookies and storage', 'Tokens, theme, avatar cache', 'Functionality and personalization'],
              ],
            },
          },
          '3.3 Data from Third Parties (External Authentication)',
          'When you use third-party login (TikTok, Google), we may receive: user identifier, public username and avatar, email (if authorized), and public video list (if authorized). Processing is strictly limited to synchronization and visualization within TENKO, acting as a personalization wrapper.',
        ],
      },
      {
        title: '4. Legal Bases for Processing',
        body: [
          {
            table: {
              headers: ['Legal Basis', 'Application in TENKO'],
              rows: [
                ['Performance of a contract', 'Account management, authentication, Service provision'],
                ['Consent', 'Analytics and advertising cookies, third-party sync'],
                ['Legitimate interest', 'Security, fraud prevention, Service improvement'],
                ['Legal compliance', 'Retention required by law, response to authorities'],
              ],
            },
          },
        ],
      },
      {
        title: '5. Purposes of Processing',
        body: [
          {
            list: [
              'Provide and maintain the Service: authentication, profiles, visualization.',
              'Personalize your experience: remember preferences, suggest content.',
              'Ensure security: detect unauthorized access, spam, fraud.',
              'Improve the Service: analyze usage patterns in aggregate and anonymized form.',
              'Comply with legal obligations: respond to competent authorities.',
              'Service-related communications (non-commercial without consent).',
            ],
          },
        ],
      },
      {
        title: '6. Data Retention',
        body: [
          {
            table: {
              headers: ['Data Type', 'Retention Period'],
              rows: [
                ['Active account data', 'While the account remains active'],
                ['Inactive account data', 'Up to 24 months after last activity'],
                ['Security logs', 'Up to 12 months'],
                ['Comments and UGC', 'Until deletion by user or moderation'],
                ['Authentication tokens', 'Until expiration or revocation'],
              ],
            },
          },
        ],
      },
      {
        title: '7. Data Sharing',
        body: [
          '7.1 Third-party service providers: Supabase (auth, DB), Vercel (hosting), external auth providers (TikTok, Google).',
          '7.2 International transfers: your data may be processed in the US. For EEA transfers, we apply Standard Contractual Clauses (SCCs) approved by the European Commission.',
          '7.3 Legal authorities: we may disclose data when required by law or court order.',
          '7.4 No sale of data: TENKO does not sell, rent, or trade your personal data.',
        ],
      },
      {
        title: '8. Your Rights',
        body: [
          {
            table: {
              headers: ['Right', 'Description'],
              rows: [
                ['Access', 'Confirm whether we process your data and access it.'],
                ['Rectification', 'Correct inaccurate or incomplete data.'],
                ['Erasure', 'Request deletion when no legal basis exists.'],
                ['Restriction', 'Restrict use under certain circumstances.'],
                ['Portability', 'Receive your data in structured format.'],
                ['Objection', 'Object to processing based on legitimate interest.'],
                ['Withdrawal of consent', 'Revoke at any time without affecting prior lawfulness.'],
              ],
            },
          },
          'To exercise these rights, contact us at: [privacy email pending]. We will respond within applicable legal timeframes.',
        ],
      },
      {
        title: '9. Data Security',
        body: [
          {
            list: [
              'Data encryption in transit (HTTPS/TLS).',
              'Password encryption with secure algorithms.',
              'Authentication via secure access tokens.',
              'PKCE protocol for OAuth flows.',
              'Restricted access to personal data.',
              'Periodic security audits.',
            ],
          },
          'No system is completely secure. We cannot guarantee absolute security of information transmitted over the Internet.',
        ],
      },
      {
        title: '10. Cookies and Tracking Technologies',
        body: [
          'Cookie use is governed by our Cookie Policy, an integral part of this Policy. Categories: strictly necessary (no consent), preferences (manageable), analytics and advertising (explicit consent only).',
        ],
      },
      {
        title: '11. Minors',
        body: [
          'The Service is not directed to minors under 16. We do not knowingly collect data from minors. If detected, we will proceed to delete it.',
        ],
      },
      {
        title: '12. Changes to this Policy',
        body: [
          'We reserve the right to modify this Policy. Updates take effect upon publication. We will notify significant changes via prominent notice or email. Continued use constitutes acceptance.',
        ],
      },
      {
        title: '13. Contact and Supervisory Authorities',
        body: [
          'Privacy email: [pending] — Support email: [pending]. If you believe processing violates regulations, you may lodge a complaint with the supervisory authority in your jurisdiction (e.g., AEPD in Spain).',
        ],
      },
      {
        title: '14. Jurisdiction-Specific Provisions',
        body: [
          '14.1 EEA: rights recognized by GDPR, including lodging complaints with the supervisory authority.',
          '14.2 California (CCPA/CPRA): right to know, delete, opt-out of sale (TENKO does not sell), correct, limit sensitive data, and non-discrimination.',
          '14.3 Latin America: rights of access, rectification, cancellation, and objection under OAS Principles and national laws.',
        ],
      },
    ],
    footerNote:
      'By continuing to browse TENKO AI, you accept our Privacy Policy and Terms and Conditions.',
  },
};
