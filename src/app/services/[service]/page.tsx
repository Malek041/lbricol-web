import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { SERVICES_HIERARCHY, getServiceVector } from '@/config/services_config';

// ─── French translations for each service ────────────────────────────────────
const SERVICE_FR: Record<string, {
  title: string;
  description: string;
  h1: string;
  intro: string;
  faqs: { q: string; a: string }[];
  cities: string[];
}> = {
  cleaning: {
    title: 'Nettoyage à domicile au Maroc',
    description: 'Réservez un service de nettoyage professionnel à domicile au Maroc. Ménage, nettoyage en profondeur, nettoyage de bureau. Bricoleurs vérifiés, tarifs transparents.',
    h1: 'Nettoyage à domicile au Maroc',
    intro: 'Lbricol vous met en relation avec des professionnels du nettoyage vérifiés à Marrakech, Casablanca, Agadir et dans toutes les grandes villes marocaines. Que vous ayez besoin d\'un ménage régulier, d\'un grand nettoyage de fin de séjour ou d\'un nettoyage de bureau, notre équipe est disponible rapidement.',
    faqs: [
      { q: 'Combien coûte un nettoyage à domicile au Maroc ?', a: 'Les tarifs varient selon la surface et le type de nettoyage. Comptez environ 150–400 MAD pour un appartement standard. Obtenez un devis gratuit sur Lbricol.' },
      { q: 'Les agents de nettoyage sont-ils vérifiés ?', a: 'Oui, tous nos Bricoleurs passent par un processus de vérification d\'identité et sont évalués par nos clients après chaque prestation.' },
      { q: 'Puis-je réserver un nettoyage le jour même ?', a: 'Oui, selon la disponibilité dans votre ville, une intervention le jour même est souvent possible.' },
    ],
    cities: ['Marrakech', 'Casablanca', 'Agadir', 'Essaouira', 'Rabat', 'Tanger'],
  },
  plumbing: {
    title: 'Plombier à domicile au Maroc',
    description: 'Trouvez un plombier professionnel près de chez vous au Maroc. Fuite d\'eau, installation sanitaire, débouchage. Intervention rapide à Marrakech, Casablanca, Agadir.',
    h1: 'Plombier à domicile au Maroc',
    intro: 'Besoin d\'un plombier urgent ? Lbricol vous connecte avec des plombiers qualifiés et disponibles dans votre quartier. Fuites, robinets, chasse d\'eau, canalisations bouchées — nos Bricoleurs interviennent rapidement.',
    faqs: [
      { q: 'Combien coûte un plombier à domicile au Maroc ?', a: 'Une intervention standard coûte entre 100 et 300 MAD selon la complexité. Des devis gratuits sont disponibles via Lbricol.' },
      { q: 'Un plombier peut-il intervenir le week-end ?', a: 'Oui, plusieurs de nos Bricoleurs proposent des interventions le week-end et jours fériés.' },
    ],
    cities: ['Marrakech', 'Casablanca', 'Agadir', 'Rabat', 'Tanger'],
  },
  electricity: {
    title: 'Électricien à domicile au Maroc',
    description: 'Réservez un électricien qualifié au Maroc. Installation, dépannage, tableau électrique, prises, interrupteurs. Intervention rapide partout au Maroc.',
    h1: 'Électricien à domicile au Maroc',
    intro: 'Panne de courant, installation de prises, remplacement de tableau — nos électriciens vérifiés interviennent rapidement chez vous au Maroc.',
    faqs: [
      { q: 'Un électricien peut-il intervenir en urgence ?', a: 'Oui, selon la disponibilité dans votre ville, une intervention urgente est possible via Lbricol.' },
      { q: 'Les électriciens sont-ils certifiés ?', a: 'Tous nos Bricoleurs sont vérifiés par notre équipe et évalués par les clients.' },
    ],
    cities: ['Marrakech', 'Casablanca', 'Agadir', 'Rabat'],
  },
  moving: {
    title: 'Déménagement au Maroc',
    description: 'Organisez votre déménagement au Maroc facilement. Aide au déménagement, transport de meubles, emballage. Bricoleurs disponibles à Marrakech, Casablanca et plus.',
    h1: 'Aide au déménagement au Maroc',
    intro: 'Vous déménagez ? Lbricol met à votre disposition des équipes sérieuses et disponibles pour transporter vos affaires en toute sécurité dans toutes les villes du Maroc.',
    faqs: [
      { q: 'Combien coûte un déménagement au Maroc ?', a: 'Le tarif dépend du volume et de la distance. Réservez via Lbricol pour obtenir un devis transparent.' },
    ],
    cities: ['Marrakech', 'Casablanca', 'Agadir', 'Rabat', 'Tanger', 'Fès'],
  },
  gardening: {
    title: 'Jardinier à domicile au Maroc',
    description: 'Réservez un jardinier professionnel au Maroc. Entretien de jardin, taille, tonte, arrosage. Service disponible à Marrakech, Agadir, Rabat et plus.',
    h1: 'Jardinier à domicile au Maroc',
    intro: 'Entretenez votre jardin ou terrasse sans effort. Nos jardiniers qualifiés interviennent partout au Maroc pour la taille, la tonte, la plantation et l\'entretien général.',
    faqs: [
      { q: 'Proposes-vous des forfaits d\'entretien mensuel de jardin ?', a: 'Oui, vous pouvez programmer des visites régulières via Lbricol à un tarif avantageux.' },
    ],
    cities: ['Marrakech', 'Agadir', 'Rabat', 'Essaouira'],
  },
  painting: {
    title: 'Peintre à domicile au Maroc',
    description: 'Trouvez un peintre professionnel au Maroc. Peinture intérieure, extérieure, ravalement. Devis gratuit, tarifs transparents à Marrakech, Casablanca, Agadir.',
    h1: 'Peinture et ravalement au Maroc',
    intro: 'Rafraîchissez votre intérieur ou extérieur grâce à nos peintres qualifiés disponibles dans toutes les grandes villes marocaines.',
    faqs: [
      { q: 'Combien coûte la peinture d\'un appartement au Maroc ?', a: 'Comptez environ 20–50 MAD/m² selon la finition. Obtenez un devis instantané sur Lbricol.' },
    ],
    cities: ['Marrakech', 'Casablanca', 'Agadir', 'Rabat'],
  },
  home_repairs: {
    title: 'Bricolage et réparations à domicile au Maroc',
    description: 'Réservez un bricoleur qualifié au Maroc. Réparations diverses, montage meuble, petits travaux. Intervention rapide à Marrakech, Casablanca, Agadir.',
    h1: 'Bricolage et réparations à domicile',
    intro: 'Petits travaux, réparations urgentes, montage — nos bricoleurs polyvalents interviennent rapidement chez vous au Maroc.',
    faqs: [
      { q: 'Quels types de réparations pouvez-vous effectuer ?', a: 'Montage de meubles, fixation d\'étagères, petites réparations diverses, installation d\'appareils, et bien plus.' },
    ],
    cities: ['Marrakech', 'Casablanca', 'Agadir', 'Rabat'],
  },
  babysitting: {
    title: 'Baby-sitter à domicile au Maroc',
    description: 'Trouvez une baby-sitter de confiance au Maroc. Garde d\'enfants à domicile, ponctuelle ou régulière. Professionnels vérifiés à Marrakech, Casablanca, Agadir.',
    h1: 'Baby-sitting à domicile au Maroc',
    intro: 'Confiez vos enfants à des gardiennes vérifiées et expérimentées, disponibles à la demande dans votre ville au Maroc.',
    faqs: [
      { q: 'Les baby-sitters sont-elles vérifiées ?', a: 'Oui, toutes nos intervenantes passent par un processus de vérification rigoureux avant de rejoindre Lbricol.' },
    ],
    cities: ['Marrakech', 'Casablanca', 'Agadir', 'Rabat'],
  },
  cooking: {
    title: 'Chef à domicile au Maroc — Cuisine marocaine',
    description: 'Réservez un chef cuisinier à domicile au Maroc. Cuisine marocaine authentique, cours de cuisine, chef privé pour événements. Disponible à Marrakech, Agadir, Essaouira.',
    h1: 'Chef cuisinier à domicile au Maroc',
    intro: 'Vivez une expérience culinaire unique chez vous. Nos chefs à domicile préparent des repas marocains authentiques, animent des cours de cuisine ou prennent en charge vos événements privés.',
    faqs: [
      { q: 'Peut-on réserver un chef pour un dîner privé ?', a: 'Absolument. Nos chefs se déplacent chez vous pour préparer un repas complet pour vos invités.' },
    ],
    cities: ['Marrakech', 'Agadir', 'Essaouira', 'Casablanca'],
  },
  tour_guide: {
    title: 'Guide touristique au Maroc',
    description: 'Réservez un guide touristique local au Maroc. Visite de médina, tour gastronomique, guide privé à Marrakech, Essaouira, Agadir, Fès.',
    h1: 'Guide touristique local au Maroc',
    intro: 'Découvrez le Maroc authentique avec un guide local passionné. Nos guides vous font découvrir les médinas, les souks, les sites historiques et la cuisine de rue.',
    faqs: [
      { q: 'Les visites se font-elles en français ?', a: 'Oui, nos guides parlent français, anglais et arabe selon votre préférence.' },
    ],
    cities: ['Marrakech', 'Essaouira', 'Agadir', 'Fès', 'Tanger'],
  },
};

// Fallback for services not explicitly listed above
function getFallback(serviceId: string, serviceName: string) {
  return {
    title: `${serviceName} au Maroc | Lbricol`,
    description: `Réservez un professionnel pour ${serviceName.toLowerCase()} au Maroc. Bricoleurs vérifiés, tarifs transparents, intervention rapide.`,
    h1: `${serviceName} au Maroc`,
    intro: `Lbricol vous connecte avec des professionnels vérifiés pour votre besoin en ${serviceName.toLowerCase()} au Maroc. Réservation rapide, tarifs transparents.`,
    faqs: [
      { q: `Combien coûte ${serviceName.toLowerCase()} au Maroc ?`, a: 'Obtenez un devis gratuit et transparent en quelques clics sur Lbricol.' },
      { q: 'Les professionnels sont-ils vérifiés ?', a: 'Oui, tous nos Bricoleurs sont vérifiés et évalués par nos clients.' },
    ],
    cities: ['Marrakech', 'Casablanca', 'Agadir', 'Rabat'],
  };
}

// ─── generateStaticParams ─────────────────────────────────────────────────────
export async function generateStaticParams() {
  return Object.keys(SERVICES_HIERARCHY).map((service) => ({ service }));
}

// ─── generateMetadata ─────────────────────────────────────────────────────────
export async function generateMetadata(
  { params }: { params: Promise<{ service: string }> }
): Promise<Metadata> {
  const { service } = await params;
  const serviceConfig = SERVICES_HIERARCHY[service];
  if (!serviceConfig) return {};

  const content = SERVICE_FR[service] ?? getFallback(service, serviceConfig.name);

  return {
    title: content.title,
    description: content.description,
    alternates: {
      canonical: `https://lbricol.com/services/${service}`,
    },
    openGraph: {
      title: content.title,
      description: content.description,
      url: `https://lbricol.com/services/${service}`,
      type: 'website',
    },
  };
}

// ─── Page Component ───────────────────────────────────────────────────────────
export default async function ServicePage(
  { params }: { params: Promise<{ service: string }> }
) {
  const { service } = await params;
  const serviceConfig = SERVICES_HIERARCHY[service];

  if (!serviceConfig) notFound();

  const content = SERVICE_FR[service] ?? getFallback(service, serviceConfig.name);
  const vectorImg = getServiceVector(service);

  // FAQ structured data
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: content.faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };

  // Service structured data
  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: content.title,
    description: content.description,
    provider: {
      '@type': 'LocalBusiness',
      name: 'Lbricol',
      url: 'https://lbricol.com',
    },
    areaServed: content.cities.map((city) => ({ '@type': 'City', name: city })),
    url: `https://lbricol.com/services/${service}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />

      <main style={{ fontFamily: 'var(--font-plus-jakarta, sans-serif)', maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>
        {/* Breadcrumb */}
        <nav aria-label="Fil d'Ariane" style={{ fontSize: '14px', color: '#888', marginBottom: '24px' }}>
          <Link href="/" style={{ color: '#FFC244', textDecoration: 'none' }}>Lbricol</Link>
          <span style={{ margin: '0 8px' }}>›</span>
          <Link href="/services" style={{ color: '#FFC244', textDecoration: 'none' }}>Services</Link>
          <span style={{ margin: '0 8px' }}>›</span>
          <span>{content.h1}</span>
        </nav>

        {/* Hero */}
        <header style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 800, color: '#1a1a1a', lineHeight: 1.2, marginBottom: '16px' }}>
            {content.h1}
          </h1>
          <p style={{ fontSize: '18px', color: '#555', lineHeight: 1.7, maxWidth: '680px' }}>
            {content.intro}
          </p>
        </header>

        {/* Cities covered */}
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a1a', marginBottom: '12px' }}>
            Villes couvertes
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {content.cities.map((city) => (
              <Link
                key={city}
                href={`/services/${service}/${city.toLowerCase()}`}
                style={{
                  display: 'inline-block',
                  padding: '8px 18px',
                  borderRadius: '999px',
                  background: '#fff8e6',
                  border: '1px solid #FFC244',
                  color: '#b8860b',
                  fontWeight: 600,
                  fontSize: '14px',
                  textDecoration: 'none',
                }}
              >
                {city}
              </Link>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section style={{ margin: '40px 0', padding: '32px', borderRadius: '16px', background: 'linear-gradient(135deg, #FFC244, #FFB700)', textAlign: 'center' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#1a1a1a', marginBottom: '12px' }}>
            Réservez maintenant
          </h2>
          <p style={{ color: '#444', marginBottom: '24px', fontSize: '16px' }}>
            Des professionnels vérifiés disponibles dans votre ville. Réservation en 2 minutes.
          </p>
          <Link
            href={`/?service=${service}`}
            style={{
              display: 'inline-block',
              padding: '14px 36px',
              borderRadius: '999px',
              background: '#1a1a1a',
              color: '#FFC244',
              fontWeight: 700,
              fontSize: '16px',
              textDecoration: 'none',
              letterSpacing: '0.3px',
            }}
          >
            Réserver un {serviceConfig.name}
          </Link>
        </section>

        {/* FAQ */}
        <section style={{ marginBottom: '60px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1a1a1a', marginBottom: '20px' }}>
            Questions fréquentes
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {content.faqs.map(({ q, a }, i) => (
              <div key={i} style={{ padding: '20px 24px', borderRadius: '12px', border: '1px solid #e5e5e5', background: '#fafafa' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a1a', marginBottom: '8px' }}>{q}</h3>
                <p style={{ fontSize: '15px', color: '#555', lineHeight: 1.6 }}>{a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer note */}
        <footer style={{ borderTop: '1px solid #eee', paddingTop: '24px', color: '#999', fontSize: '14px' }}>
          <Link href="/" style={{ color: '#FFC244', textDecoration: 'none', fontWeight: 600 }}>← Retour à l&apos;accueil Lbricol</Link>
        </footer>
      </main>
    </>
  );
}
