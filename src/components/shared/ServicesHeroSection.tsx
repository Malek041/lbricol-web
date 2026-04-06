"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';

interface ServiceCardProps {
  id: string;
  title: string;
  description: string;
  image: string;
  onOrder: (id: string) => void;
}

const ServiceCard = ({ id, title, description, image, onOrder }: ServiceCardProps) => {
  const brandYellow = '#FFCC02';
  const [imgSrc, setImgSrc] = React.useState(image);
  const [fallbackIndex, setFallbackIndex] = React.useState(0);

  // Extract the filename from the initial path
  const filename = image.split('/').pop();

  const fallbacks = [
    `/Images/Desktop hero section images/${filename}`,
    `/Images/clientHomeHeroSection/${filename}`,
    `/Images/Service Category vectors/${filename?.replace(/\.[^/.]+$/, "")}.webp`, // Try webp in vectors
    `/Images/Service Category vectors/${filename?.replace(/\.[^/.]+$/, "")}.png`,  // Try png in vectors
    image // Original as last resort
  ];

  const handleImgError = () => {
    if (fallbackIndex < fallbacks.length - 1) {
      const nextIndex = fallbackIndex + 1;
      setFallbackIndex(nextIndex);
      setImgSrc(fallbacks[nextIndex]);
    }
  };

  return (
    <motion.div
      whileHover={{ y: -10 }}
      style={{
        flex: '0 0 450px',
        height: '450px',
        backgroundColor: brandYellow,
        borderRadius: '40px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        marginRight: '20px',
        position: 'relative'
      }}
      onClick={() => onOrder(id)}
    >
      {/* Top Image Section */}
      <div style={{ height: '60%', width: '100%', backgroundColor: '#fff', position: 'relative', overflow: 'hidden' }}>
        <img
          src={imgSrc}
          alt={title}
          onError={handleImgError}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
      </div>

      {/* Bottom Yellow Section with Waved Edge */}
      <div style={{
        height: '40%',
        padding: '24px',
        backgroundColor: brandYellow,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative'
      }}>
        {/* SVG Wave at the top of the yellow section */}
        <div style={{
          position: 'absolute',
          top: '-45px',
          left: 0,
          right: 0,
          height: '50px',
          overflow: 'hidden',
          zIndex: 1
        }}>
          <svg viewBox="0 0 500 50" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
            <path d="M0,50 Q250,5 500,50 L500,50 L0,50 Z" fill={brandYellow} />
          </svg>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', zIndex: 2 }}>
          <h3 style={{
            fontSize: '48px',
            fontWeight: 900,
            color: '#000000ff',
            margin: 0,
            letterSpacing: '-2px',
            fontFamily: 'Uber Move, var(--font-sans)',
          }}>
            {title}
          </h3>
          <p style={{
            fontSize: '14px',
            fontWeight: 500,
            color: '#000000ff',
            maxWidth: '280px',
            lineHeight: '1.2',
            margin: 0,
            opacity: 0.95
          }}>
            {description}
          </p>
        </div>

        {/* Order Button */}
        <div style={{
          position: 'absolute',
          right: '24px',
          bottom: '24px',
          backgroundColor: '#01A083',
          color: '#fff',
          padding: '10px 24px',
          borderRadius: '24px',
          fontSize: '13px',
          fontWeight: 800,
          textTransform: 'none',
          zIndex: 2
        }}>
          Order
        </div>
      </div>
    </motion.div>
  );
};

interface ServicesHeroSectionProps {
  availableServiceIds?: string[] | null;
  onSelectService?: (serviceId: string) => void;
}

const ServicesHeroSection = ({ availableServiceIds, onSelectService }: ServicesHeroSectionProps) => {
  const { t } = useLanguage();

  const allServices = [
    {
      id: 'errands',
      title: t({ en: 'Errands', fr: 'Coursier', ar: 'توصيل' }),
      description: 'You can Order delivery of anything in the city from your place in few steps.',
      image: '/Images/Desktop hero section images/Errands.webp'
    },
    {
      id: 'babysitting',
      title: t({ en: 'Babysitting', fr: 'Nounou', ar: 'جليسة أطفال' }),
      description: 'You can Order reliable child care and expert sitters from your place in few steps.',
      image: '/Images/Desktop hero section images/baybsetting.webp'
    },
    {
      id: 'gardening',
      title: t({ en: 'Gardening', fr: 'Jardinage', ar: 'بستنة' }),
      description: 'You can Order professional landscaping and lawn care from your place in few steps.',
      image: '/Images/Desktop hero section images/Gardening.webp'
    },
    {
      id: 'driver',
      title: t({ en: 'Driver', fr: 'Chauffeur', ar: 'سائق' }),
      description: 'You can Order personal drivers and intercity trips from your place in few steps.',
      image: '/Images/Desktop hero section images/Driver.gif'
    },
    {
      id: 'pets_care',
      title: t({ en: 'Pets Care', fr: 'Animaux', ar: 'حيوانات أليفة' }),
      description: 'You can Order dedicated pet walking and grooming from your place in few steps.',
      image: '/Images/Desktop hero section images/petsCare.webp'
    },
    {
      id: 'cleaning',
      title: t({ en: 'Cleaning', fr: 'Ménage', ar: 'تنظيف' }),
      description: 'You can Order professional home cleaning and housekeeping services.',
      image: '/Images/clientHomeHeroSection/Cleaning.png'
    },
    {
      id: 'handyman',
      title: t({ en: 'Handyman', fr: 'Bricolage', ar: 'إصلاحات' }),
      description: 'You can Order expert help for repairs, assembly, and home maintenance.',
      image: '/Images/Job Cards Images/handyman_bg_card.webp'
    }
  ];

  const services = availableServiceIds
    ? allServices.filter(s => availableServiceIds.includes(s.id))
    : allServices;

  if (services.length === 0) return null;

  return (
    <section className="desktop-only-hero" style={{
      backgroundColor: '#FFB700',
      padding: '40px 0 100px 0',
      overflow: 'hidden',
      display: 'none',
      position: 'relative'
    }}>
      <style jsx>{`
        @media (min-width: 969px) {
          .desktop-only-hero {
            display: block !important;
          }
        }
        
        .services-scroll-container::-webkit-scrollbar {
          display: none;
        }
        .services-scroll-container {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Header for Desktop */}
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto 30px auto',
        padding: '0 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        zIndex: 2
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/Images/map Assets/LocationPin.png" alt="Logo" style={{ height: '32px' }} />
          <span style={{ fontSize: '24px', fontWeight: 700, color: '#037B3E' }}>Lbricol</span>
        </div>
        <button style={{
          backgroundColor: '#037B3E',
          color: '#FFF',
          padding: '6px 20px',
          borderRadius: '24px',
          border: 'none',
          fontSize: '14px',
          fontWeight: 900,
          cursor: 'pointer',
        }}>
          Become a Bricoler
        </button>
      </div>

      <div
        className="services-scroll-container"
        style={{
          display: 'flex',
          overflowX: 'auto',
          padding: '60px 40px 80px 40px',
          scrollSnapType: 'x mandatory',
          scrollBehavior: 'smooth',
          position: 'relative',
          zIndex: 2
        }}
      >
        {services.map((service) => (
          <ServiceCard
            key={service.id}
            id={service.id}
            title={service.title}
            description={service.description}
            image={service.image}
            onOrder={(id) => onSelectService?.(id)}
          />
        ))}

        {allServices.length > services.length && (
          <ServiceCard
            id="more"
            title={t({ en: 'And More', fr: 'Et Plus', ar: 'والمزيد' })}
            description="Discover all our other specialized services available in other locations."
            image="/Images/Desktop hero section images/andMore.webp"
            onOrder={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          />
        )}
      </div>

      {/* Hero Bottom Curve */}
      <div style={{
        position: 'absolute',
        bottom: -1,
        left: 0,
        width: '100%',
        lineHeight: 0,
        zIndex: 1,
        pointerEvents: 'none'
      }}>
        <svg
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          style={{
            width: '100%',
            height: '120px', // Increased height for more pronounced curve
            display: 'block'
          }}
        >
          <path
            d="M0,0 C480,100 960,100 1440,0 L1440,120 L0,120 Z"
            fill="#ffffff"
          />
        </svg>
      </div>
    </section>
  );
};

export default ServicesHeroSection;
