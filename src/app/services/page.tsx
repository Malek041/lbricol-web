import { Metadata } from 'next';
import Link from 'next/link';
import { SERVICES_HIERARCHY } from '@/config/services_config';

export const metadata: Metadata = {
  title: 'Tous nos services à domicile au Maroc | Lbricol',
  description:
    'Découvrez tous les services à domicile proposés par Lbricol au Maroc : nettoyage, plomberie, électricité, déménagement, jardinage, baby-sitting et bien plus encore.',
  alternates: { canonical: 'https://lbricol.com/services' },
};

const CITIES = ['Marrakech', 'Casablanca', 'Agadir', 'Essaouira', 'Rabat', 'Tanger'];

const SERVICE_FR_NAMES: Record<string, string> = {
  cleaning:           'Nettoyage à domicile',
  plumbing:           'Plomberie',
  electricity:        'Électricité',
  moving:             'Déménagement',
  gardening:          'Jardinage',
  painting:           'Peinture',
  home_repairs:       'Bricolage & Réparations',
  furniture_assembly: 'Montage de meubles',
  mounting:           'Fixation & Montage',
  babysitting:        "Garde d'enfants",
  cooking:            'Chef à domicile',
  tour_guide:         'Guide touristique',
  car_rental:         'Location de voiture',
  errands:            'Courses & Commissions',
  glass_cleaning:     'Nettoyage de vitres',
  pool_cleaning:      'Entretien de piscine',
  pets_care:          "Garde d'animaux",
  elderly_care:       'Aide aux personnes âgées',
  learn_arabic:       "Cours d'arabe",
};

export default function ServicesIndexPage() {
  const allServices = Object.values(SERVICES_HIERARCHY);

  const indexSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Services à domicile Lbricol Maroc',
    itemListElement: allServices.map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: SERVICE_FR_NAMES[s.id] ?? s.name,
      url: `https://lbricol.com/services/${s.id}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(indexSchema) }}
      />

      <main style={{ fontFamily: 'var(--font-plus-jakarta, sans-serif)', maxWidth: '960px', margin: '0 auto', padding: '48px 20px' }}>

        {/* Header */}
        <header style={{ marginBottom: '48px', textAlign: 'center' }}>
          <Link href="/" style={{ display: 'inline-block', marginBottom: '20px' }}>
            <span style={{ fontSize: '22px', fontWeight: 800, color: '#FFC244', letterSpacing: '-0.5px' }}>Lbricol</span>
          </Link>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 800, color: '#1a1a1a', lineHeight: 1.2, marginBottom: '16px' }}>
            Tous nos services à domicile au Maroc
          </h1>
          <p style={{ fontSize: '18px', color: '#666', maxWidth: '600px', margin: '0 auto', lineHeight: 1.7 }}>
            Trouvez et réservez des professionnels vérifiés pour tous vos besoins à domicile —
            disponibles à Marrakech, Casablanca, Agadir, Essaouira et plus.
          </p>
        </header>

        {/* Service Grid */}
        <section style={{ marginBottom: '60px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '16px',
          }}>
            {allServices.map((service) => (
              <Link
                key={service.id}
                href={`/services/${service.id}`}
                style={{
                  display: 'block',
                  padding: '24px',
                  borderRadius: '14px',
                  border: '1px solid #ebebeb',
                  background: '#fff',
                  textDecoration: 'none',
                  transition: 'box-shadow 0.2s',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '17px', color: '#1a1a1a', marginBottom: '6px' }}>
                  {SERVICE_FR_NAMES[service.id] ?? service.name}
                </div>
                <div style={{ fontSize: '13px', color: '#888' }}>
                  {service.subServices.length} prestations disponibles
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Popular by city */}
        <section style={{ marginBottom: '60px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1a1a1a', marginBottom: '20px' }}>
            Services populaires par ville
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
            {CITIES.map((city) => (
              <div key={city} style={{ padding: '18px', borderRadius: '12px', border: '1px solid #f0f0f0', background: '#fafafa' }}>
                <div style={{ fontWeight: 700, fontSize: '15px', color: '#1a1a1a', marginBottom: '10px' }}>📍 {city}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {['cleaning', 'plumbing', 'electricity'].map((sId) => (
                    <Link
                      key={sId}
                      href={`/services/${sId}/${city.toLowerCase()}`}
                      style={{ fontSize: '13px', color: '#FFC244', textDecoration: 'none', fontWeight: 500 }}
                    >
                      → {SERVICE_FR_NAMES[sId]}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section style={{ padding: '40px', borderRadius: '20px', background: 'linear-gradient(135deg, #FFC244 0%, #FFB700 100%)', textAlign: 'center' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#1a1a1a', marginBottom: '12px' }}>
            Prêt à réserver ?
          </h2>
          <p style={{ color: '#333', marginBottom: '24px', fontSize: '16px' }}>
            Des Bricoleurs disponibles maintenant dans votre ville.
          </p>
          <Link
            href="/"
            style={{
              display: 'inline-block',
              padding: '14px 40px',
              borderRadius: '999px',
              background: '#1a1a1a',
              color: '#FFC244',
              fontWeight: 700,
              fontSize: '16px',
              textDecoration: 'none',
            }}
          >
            Accéder à Lbricol →
          </Link>
        </section>
      </main>
    </>
  );
}
