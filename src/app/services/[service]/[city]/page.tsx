import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { SERVICES_HIERARCHY, getServiceVector } from '@/config/services_config';

const CITIES: Record<string, { name: string; nameAr: string; nameFr: string; region: string }> = {
  marrakech:  { name: 'Marrakech',  nameAr: 'مراكش',     nameFr: 'Marrakech',  region: 'Marrakech-Safi' },
  casablanca: { name: 'Casablanca', nameAr: 'الدار البيضاء', nameFr: 'Casablanca', region: 'Casablanca-Settat' },
  agadir:     { name: 'Agadir',     nameAr: 'أكادير',     nameFr: 'Agadir',     region: 'Souss-Massa' },
  essaouira:  { name: 'Essaouira',  nameAr: 'الصويرة',    nameFr: 'Essaouira',  region: 'Marrakech-Safi' },
  rabat:      { name: 'Rabat',      nameAr: 'الرباط',     nameFr: 'Rabat',      region: 'Rabat-Salé-Kénitra' },
  tanger:     { name: 'Tanger',     nameAr: 'طنجة',       nameFr: 'Tanger',     region: 'Tanger-Tétouan-Al Hoceima' },
  fes:        { name: 'Fès',        nameAr: 'فاس',        nameFr: 'Fès',        region: 'Fès-Meknès' },
  meknes:     { name: 'Meknès',     nameAr: 'مكناس',      nameFr: 'Meknès',     region: 'Fès-Meknès' },
};

const SERVICE_VERB: Record<string, string> = {
  cleaning:         'nettoyage à domicile',
  plumbing:         'plombier',
  electricity:      'électricien',
  moving:           'déménagement',
  gardening:        'jardinier',
  painting:         'peintre',
  home_repairs:     'bricoleur / réparations',
  babysitting:      'baby-sitter',
  cooking:          'chef cuisinier à domicile',
  tour_guide:       'guide touristique',
  furniture_assembly: 'montage de meubles',
  mounting:         'fixation & montage',
  car_rental:       'location de voiture',
  errands:          'courses & commissions',
  glass_cleaning:   'nettoyage de vitres',
  pool_cleaning:    'entretien de piscine',
  pets_care:        'garde d\'animaux',
  elderly_care:     'aide aux personnes âgées',
  learn_arabic:     'cours d\'arabe',
};

export async function generateStaticParams() {
  const cityKeys = Object.keys(CITIES);
  const serviceKeys = Object.keys(SERVICES_HIERARCHY);
  return serviceKeys.flatMap((service) =>
    cityKeys.map((city) => ({ service, city }))
  );
}

export async function generateMetadata(
  { params }: { params: Promise<{ service: string; city: string }> }
): Promise<Metadata> {
  const { service, city } = await params;
  const serviceConfig = SERVICES_HIERARCHY[service];
  const cityConfig = CITIES[city];
  if (!serviceConfig || !cityConfig) return {};

  const verb = SERVICE_VERB[service] ?? serviceConfig.name.toLowerCase();
  const title = `${cityConfig.nameFr.charAt(0).toUpperCase() + cityConfig.nameFr.slice(1)} — ${verb.charAt(0).toUpperCase() + verb.slice(1)} | Lbricol`;
  const description = `Besoin d'un ${verb} à ${cityConfig.nameFr} ? Lbricol vous connecte avec des professionnels vérifiés. Réservation rapide, tarifs transparents, intervention en ${cityConfig.region}.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://lbricol.com/services/${service}/${city}`,
    },
    openGraph: {
      title,
      description,
      url: `https://lbricol.com/services/${service}/${city}`,
      type: 'website',
    },
  };
}

export default async function CityServicePage(
  { params }: { params: Promise<{ service: string; city: string }> }
) {
  const { service, city } = await params;
  const serviceConfig = SERVICES_HIERARCHY[service];
  const cityConfig = CITIES[city];

  if (!serviceConfig || !cityConfig) notFound();

  const verb = SERVICE_VERB[service] ?? serviceConfig.name.toLowerCase();
  const cityName = cityConfig.nameFr;

  // LocalBusiness + Service structured data
  const localSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: `${verb.charAt(0).toUpperCase() + verb.slice(1)} à ${cityName}`,
    description: `Service de ${verb} disponible à ${cityName}, Maroc. Via Lbricol — professionnels vérifiés.`,
    provider: {
      '@type': 'LocalBusiness',
      name: 'Lbricol',
      url: 'https://lbricol.com',
    },
    areaServed: {
      '@type': 'City',
      name: cityName,
      containedInPlace: { '@type': 'AdministrativeArea', name: cityConfig.region },
    },
    url: `https://lbricol.com/services/${service}/${city}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localSchema) }}
      />

      <main style={{ fontFamily: 'var(--font-plus-jakarta, sans-serif)', maxWidth: '860px', margin: '0 auto', padding: '40px 20px' }}>

        {/* Breadcrumb */}
        <nav aria-label="Fil d'Ariane" style={{ fontSize: '14px', color: '#888', marginBottom: '28px' }}>
          <Link href="/" style={{ color: '#FFC244', textDecoration: 'none' }}>Lbricol</Link>
          <span style={{ margin: '0 8px' }}>›</span>
          <Link href="/services" style={{ color: '#FFC244', textDecoration: 'none' }}>Services</Link>
          <span style={{ margin: '0 8px' }}>›</span>
          <Link href={`/services/${service}`} style={{ color: '#FFC244', textDecoration: 'none' }}>{serviceConfig.name}</Link>
          <span style={{ margin: '0 8px' }}>›</span>
          <span>{cityName}</span>
        </nav>

        {/* H1 */}
        <header style={{ marginBottom: '36px' }}>
          <h1 style={{ fontSize: 'clamp(26px, 5vw, 40px)', fontWeight: 800, color: '#1a1a1a', lineHeight: 1.2, marginBottom: '14px' }}>
            {verb.charAt(0).toUpperCase() + verb.slice(1)} à {cityName}
          </h1>
          <p style={{ fontSize: '17px', color: '#555', lineHeight: 1.7, maxWidth: '640px' }}>
            Vous cherchez un <strong>{verb}</strong> à <strong>{cityName}</strong> ? Lbricol vous met en relation avec des
            professionnels vérifiés, disponibles rapidement dans votre quartier en {cityConfig.region}.
          </p>
        </header>

        {/* Why Lbricol */}
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a1a', marginBottom: '16px' }}>
            Pourquoi choisir Lbricol à {cityName} ?
          </h2>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              `Professionnels de ${verb} vérifiés et évalués par nos clients`,
              'Réservation en ligne en moins de 2 minutes',
              'Tarifs transparents — devis gratuit avant intervention',
              `Disponibles à ${cityName} et dans sa région`,
              'Paiement sécurisé après la prestation',
            ].map((item, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '15px', color: '#444' }}>
                <span style={{ color: '#FFC244', fontWeight: 900, flexShrink: 0 }}>✓</span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* CTA */}
        <section style={{ margin: '40px 0', padding: '32px', borderRadius: '16px', background: 'linear-gradient(135deg, #FFC244, #FFB700)', textAlign: 'center' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1a1a1a', marginBottom: '10px' }}>
            Réservez un {verb} à {cityName}
          </h2>
          <p style={{ color: '#444', marginBottom: '22px', fontSize: '15px' }}>
            Des Bricoleurs disponibles maintenant — réservez en 2 minutes.
          </p>
          <Link
            href={`/?service=${service}&city=${city}`}
            style={{
              display: 'inline-block',
              padding: '14px 36px',
              borderRadius: '999px',
              background: '#1a1a1a',
              color: '#FFC244',
              fontWeight: 700,
              fontSize: '16px',
              textDecoration: 'none',
            }}
          >
            Réserver maintenant →
          </Link>
        </section>

        {/* Sub-services */}
        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a1a', marginBottom: '14px' }}>
            Nos prestations de {verb} à {cityName}
          </h2>
          <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
            {serviceConfig.subServices.map((sub) => (
              <li
                key={sub.id}
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid #f0f0f0',
                  background: '#fafafa',
                  fontSize: '14px',
                  color: '#333',
                  fontWeight: 500,
                }}
              >
                {sub.name}
              </li>
            ))}
          </ul>
        </section>

        {/* Other cities */}
        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a1a', marginBottom: '12px' }}>
            {serviceConfig.name} dans d&apos;autres villes
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {Object.entries(CITIES)
              .filter(([key]) => key !== city)
              .map(([key, c]) => (
                <Link
                  key={key}
                  href={`/services/${service}/${key}`}
                  style={{
                    padding: '7px 16px',
                    borderRadius: '999px',
                    border: '1px solid #e5e5e5',
                    background: '#fff',
                    color: '#555',
                    fontSize: '13px',
                    textDecoration: 'none',
                    fontWeight: 500,
                  }}
                >
                  {c.nameFr}
                </Link>
              ))}
          </div>
        </section>

        {/* Footer nav */}
        <footer style={{ borderTop: '1px solid #eee', paddingTop: '20px', color: '#999', fontSize: '13px' }}>
          <Link href={`/services/${service}`} style={{ color: '#FFC244', textDecoration: 'none', fontWeight: 600 }}>
            ← Tous les services {serviceConfig.name}
          </Link>
          <span style={{ margin: '0 12px' }}>•</span>
          <Link href="/" style={{ color: '#FFC244', textDecoration: 'none', fontWeight: 600 }}>
            Accueil Lbricol
          </Link>
        </footer>
      </main>
    </>
  );
}
