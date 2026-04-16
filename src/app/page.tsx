import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import HomeOrchestrator from '@/features/client/components/HomeOrchestrator';
import { SERVICES_HIERARCHY } from '@/config/services_config';

export const metadata: Metadata = {
  title: "Lbricol — Services à domicile au Maroc | Aide experte, tout de suite",
  description: "Réservez des professionnels de confiance au Maroc pour le nettoyage, la plomberie, l'électricité, le déménagement et plus encore. Intervention rapide à Marrakech, Casablanca, Agadir, Essaouira, Rabat.",
  alternates: {
    canonical: "https://lbricol.com",
  },
};

const MOROCCAN_CITIES = [
  { id: 'casablanca', name: 'Casablanca' },
  { id: 'marrakech', name: 'Marrakech' },
  { id: 'rabat', name: 'Rabat' },
  { id: 'agadir', name: 'Agadir' },
  { id: 'essaouira', name: 'Essaouira' },
  { id: 'tanger', name: 'Tanger' },
  { id: 'fes', name: 'Fès' },
  { id: 'meknes', name: 'Meknès' }
];

export default function Page() {
  return (
    <>
      {/* 
          SEO Shell: This content is rendered on the server and is visible to search engines 
          immediately. It provides the core keywords and structure that Google's crawler
          uses to understand the page.
      */}
      <div className="sr-only" aria-hidden="true" style={{ position: 'absolute', width: '1px', height: '1px', padding: '0', margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: '0' }}>
        <h1>Lbricol — Services à domicile de confiance au Maroc</h1>
        <p>
          Besoin d&apos;une aide ménagère, d&apos;un plombier, d&apos;un électricien ou d&apos;un déménageur au Maroc ? 
          Lbricol vous connecte avec des professionnels vérifiés pour tous vos besoins domestiques.
        </p>
        
        <section>
          <h2>Nos Services au Maroc</h2>
          <ul>
            {Object.values(SERVICES_HIERARCHY).map((service) => (
              <li key={service.id}>
                <Link href={`/services/${service.id}`}>
                  {service.name}
                </Link>
                <ul>
                  {service.subServices.slice(0, 3).map(sub => (
                    <li key={sub.id}>{sub.name}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2>Villes desservies</h2>
          <ul>
            {MOROCCAN_CITIES.map(city => (
              <li key={city.id}>
                <strong>{city.name}</strong>: 
                {Object.values(SERVICES_HIERARCHY).slice(0, 5).map(service => (
                  <Link key={`${city.id}-${service.id}`} href={`/services/${service.id}/${city.id}`}>
                    {service.name} à {city.name}
                  </Link>
                ))}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* The actual interactive app */}
      <HomeOrchestrator />
    </>
  );
}
