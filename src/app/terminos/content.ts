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

export const termsPolicy: Record<Locale, PolicyContent> = {
  es: {
    title: 'Términos y Condiciones de Uso',
    lastUpdated: 'Última actualización: Octubre de 2026',
    sections: [
      {
        title: '1. Introducción y Aceptación de los Términos',
        body: [
          'Bienvenido a TENKO (TENKO天気). El acceso y uso de esta plataforma, sus servicios, aplicaciones y herramientas (en adelante, el "Servicio") están sujetos a los presentes Términos y Condiciones. Al acceder, navegar, registrarse o utilizar cualquier función de TENKO, usted acepta estar legalmente vinculado por estos términos en su totalidad, así como por nuestra Política de Cookies y Privacidad. Si no está de acuerdo con alguna parte de estos términos, debe abstenerse de utilizar el Servicio.',
        ],
      },
      {
        title: '2. Naturaleza del Servicio y Política de No Alojamiento (Safe Harbor)',
        body: [
          'TENKO opera estrictamente como una interfaz web y un agregador social. Nuestra plataforma permite a los usuarios sincronizar y visualizar contenido a través de integraciones de terceros.',
          'Aviso Legal sobre Contenido Multimedia:',
          'TENKO no aloja, no almacena, no transfiere, no codifica ni distribuye ningún tipo de archivo multimedia (incluyendo, pero sin limitarse a, videos MP4, streams HLS, archivos de audio o imágenes protegidas) en sus propios servidores. Todo el contenido audiovisual visualizado en la sección de "Shorts" o en los perfiles de usuario proviene de incrustaciones de terceros (embeds) o interfaces de programación de aplicaciones (API) externas.',
          'La responsabilidad sobre la legalidad, los derechos de autor y la naturaleza de dicho contenido recae de manera exclusiva en las plataformas de origen donde dichos archivos están físicamente almacenados y en el usuario que decide vincularlos.',
        ],
      },
      {
        title: '3. Integración con Terceros y Autenticación',
        body: [
          'El Servicio permite la vinculación y autenticación mediante plataformas de terceros. Al utilizar la función "Continuar con..." u otorgar permisos de acceso, usted comprende y acepta que:',
          {
            list: [
              'TENKO actuará únicamente como una capa de personalización (wrapper) y lectura de datos públicos autorizados por usted.',
              'El uso de estas integraciones está sujeto a los términos de servicio, políticas de privacidad y directrices de la plataforma de origen correspondiente.',
              'Cualquier revocación de acceso a la cuenta de terceros deberá ser gestionada directamente desde la configuración de seguridad de dicha plataforma.',
            ],
          },
        ],
      },
      {
        title: '4. Propiedad Intelectual y Notificaciones de Infracción',
        body: [
          'TENKO respeta plenamente los derechos de propiedad intelectual de terceros bajo los estándares y normativas internacionales de derechos de autor. Dado que actuamos como un mero conducto de información (Safe Harbor):',
          {
            list: [
              'Si usted es titular de derechos de autor y cree de buena fe que algún enlace indexado en TENKO infringe sus derechos, puede enviar una notificación formal de retiro (Takedown Notice) a nuestro equipo de soporte.',
              'Tras la verificación, procederemos diligentemente a la desvinculación, bloqueo o eliminación del enlace de nuestro índice, sin que esto implique la eliminación del archivo del servidor de origen (el cual no controlamos).',
            ],
          },
        ],
      },
      {
        title: '5. Conducta del Usuario y Contenido Generado por la Comunidad (UGC)',
        body: [
          'Los usuarios son los únicos responsables de cualquier texto, comentario, biografía o enlace que compartan en TENKO. Queda estrictamente prohibido utilizar la plataforma para:',
          {
            list: [
              'Fomentar el discurso de odio, discriminación, violencia o acoso sistemático contra cualquier individuo o grupo.',
              'Distribuir software malicioso, spam, esquemas fraudulentos o enlaces de phishing.',
              'Incurrir en suplantación de identidad (impersonation) de creadores, estudios de animación, o personal de TENKO.',
            ],
          },
          'TENKO se reserva el derecho unilateral de suspender, limitar o eliminar de manera permanente cualquier cuenta que infrinja estas normas de convivencia, sin obligación de notificación previa.',
        ],
      },
      {
        title: '6. Limitación de Responsabilidad y Exención de Garantías',
        body: [
          'El Servicio de TENKO se proporciona "tal cual" (AS IS) y "según disponibilidad". En la medida máxima permitida por las leyes aplicables a nivel internacional, TENKO, sus desarrolladores, directores y afiliados renuncian a cualquier garantía expresa o implícita relacionada con el rendimiento de la web, la disponibilidad ininterrumpida, o la exactitud del contenido mostrado.',
          'TENKO no será responsable por daños directos, indirectos, incidentales o consecuentes (incluida la pérdida de datos o interrupción del uso) que deriven del uso de la plataforma o de la incapacidad para acceder a servicios de terceros integrados.',
        ],
      },
      {
        title: '7. Jurisdicción, Resolución de Disputas y Modificaciones',
        body: [
          'Cualquier disputa derivada o relacionada con estos términos y el uso de TENKO se interpretará y resolverá de acuerdo con las leyes aplicables de la jurisdicción competente en la que se registre la entidad legal operadora del sitio, excluyendo conflictos de principios legales.',
          'Nos reservamos el derecho de modificar estos Términos y Condiciones en cualquier momento para reflejar cambios legales, técnicos o comerciales. Las actualizaciones entrarán en vigor en el momento de su publicación. Es responsabilidad del usuario revisar periódicamente esta página. El uso continuado del sitio constituirá la aceptación irrevocable de los términos modificados.',
        ],
      },
    ],
    footerNote:
      'Al continuar navegando en TENKO AI, aceptas nuestros Términos y Condiciones y nuestra Política de Cookies.',
  },

  en: {
    title: 'Terms and Conditions of Use',
    lastUpdated: 'Last updated: October 2026',
    sections: [
      {
        title: '1. Introduction and Acceptance of Terms',
        body: [
          'Welcome to TENKO (TENKO天気). Access to and use of this platform, its services, applications, and tools (the "Service") are subject to these Terms and Conditions. By accessing, browsing, registering, or using any feature of TENKO, you agree to be legally bound by these terms in their entirety, as well as by our Cookie and Privacy Policy. If you disagree with any part of these terms, you must refrain from using the Service.',
        ],
      },
      {
        title: '2. Nature of the Service and No-Hosting Policy (Safe Harbor)',
        body: [
          'TENKO operates strictly as a web interface and social aggregator. Our platform allows users to synchronize and view content through third-party integrations.',
          'Legal Notice on Multimedia Content:',
          'TENKO does not host, store, transfer, encode, or distribute any type of multimedia file (including, but not limited to, MP4 videos, HLS streams, audio files, or protected images) on its own servers. All audiovisual content viewed in the "Shorts" section or in user profiles comes from third-party embeds or external application programming interfaces (APIs).',
          'Responsibility for the legality, copyright, and nature of such content rests exclusively with the originating platforms where such files are physically stored, and with the user who chooses to link them.',
        ],
      },
      {
        title: '3. Third-Party Integration and Authentication',
        body: [
          'The Service allows linking and authentication through third-party platforms. By using the "Continue with..." feature or granting access permissions, you understand and accept that:',
          {
            list: [
              'TENKO will act solely as a personalization layer (wrapper) and reader of public data authorized by you.',
              'The use of these integrations is subject to the terms of service, privacy policies, and guidelines of the corresponding source platform.',
              'Any revocation of access to the third-party account must be managed directly from the security settings of that platform.',
            ],
          },
        ],
      },
      {
        title: '4. Intellectual Property and Infringement Notices',
        body: [
          'TENKO fully respects the intellectual property rights of third parties under international copyright standards and regulations. Since we act as a mere information conduit (Safe Harbor):',
          {
            list: [
              'If you are a copyright holder and believe in good faith that any link indexed on TENKO infringes your rights, you may send a formal Takedown Notice to our support team.',
              'After verification, we will diligently proceed to unlink, block, or remove the link from our index, without this implying the deletion of the file from the source server (which we do not control).',
            ],
          },
        ],
      },
      {
        title: '5. User Conduct and User-Generated Content (UGC)',
        body: [
          'Users are solely responsible for any text, comment, biography, or link they share on TENKO. It is strictly prohibited to use the platform to:',
          {
            list: [
              'Promote hate speech, discrimination, violence, or systematic harassment against any individual or group.',
              'Distribute malicious software, spam, fraudulent schemes, or phishing links.',
              'Engage in impersonation of creators, animation studios, or TENKO staff.',
            ],
          },
          'TENKO reserves the unilateral right to suspend, limit, or permanently delete any account that violates these community standards, without prior notification obligation.',
        ],
      },
      {
        title: '6. Limitation of Liability and Disclaimer of Warranties',
        body: [
          'The TENKO Service is provided "AS IS" and "as available". To the maximum extent permitted by applicable international laws, TENKO, its developers, directors, and affiliates disclaim any express or implied warranty related to website performance, uninterrupted availability, or accuracy of displayed content.',
          'TENKO shall not be liable for direct, indirect, incidental, or consequential damages (including data loss or interruption of use) arising from the use of the platform or the inability to access integrated third-party services.',
        ],
      },
      {
        title: '7. Jurisdiction, Dispute Resolution, and Modifications',
        body: [
          'Any dispute arising from or related to these terms and the use of TENKO shall be interpreted and resolved in accordance with the applicable laws of the competent jurisdiction where the legal entity operating the site is registered, excluding conflicts of legal principles.',
          'We reserve the right to modify these Terms and Conditions at any time to reflect legal, technical, or commercial changes. Updates take effect upon publication. It is the user\'s responsibility to periodically review this page. Continued use of the site constitutes irrevocable acceptance of the modified terms.',
        ],
      },
    ],
    footerNote:
      'By continuing to browse TENKO AI, you accept our Terms and Conditions and our Cookie Policy.',
  },
};
