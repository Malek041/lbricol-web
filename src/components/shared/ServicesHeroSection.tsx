"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';

interface ServiceCardProps {
  title: string;
  description: string;
  image: string;
  onOrder: () => void;
}

const ServiceCard = ({ title, description, image, onOrder }: ServiceCardProps) => {
  return (
    <motion.div
      whileHover={{ y: -10 }}
      style={{
        flex: '0 0 450px',
        height: '450px',
        backgroundColor: '#FFD700',
        borderRadius: '0px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        marginRight: '20px',
        position: 'relative'
      }}
      onClick={onOrder}
    >
      {/* Top Image Section */}
      <div style={{ height: '60%', width: '100%', backgroundColor: '#fff', position: 'relative', overflow: 'hidden' }}>
        <img
          src={image}
          alt={title}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
      </div>

      {/* Bottom Yellow Section */}
      <div style={{
        height: '40%',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h3 style={{
            fontSize: '48px',
            fontWeight: 900,
            color: '#000',
            margin: 0,
            letterSpacing: '-2px',
            fontFamily: 'Uber Move, var(--font-sans)',
            textTransform: 'uppercase'
          }}>
            {title}
          </h3>
          <p style={{
            fontSize: '14px',
            fontWeight: 500,
            color: '#000',
            maxWidth: '280px',
            lineHeight: '1.2',
            margin: 0,
            opacity: 0.9
          }}>
            {description}
          </p>
        </div>

        {/* Order Button - Pill shape green */}
        <div style={{
          position: 'absolute',
          right: '24px',
          bottom: '24px',
          backgroundColor: '#027963',
          color: '#fff',
          padding: '10px 24px',
          borderRadius: '24px',
          fontSize: '13px',
          fontWeight: 800,
          textTransform: 'none'
        }}>
          Order
        </div>
      </div>
    </motion.div>
  );
};

const ServicesHeroSection = () => {
  const { t } = useLanguage();

  const services = [
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
      id: 'and_more',
      title: t({ en: 'And More', fr: 'Et Plus', ar: 'والمزيد' }),
      description: 'You can Order from 50+ other specialized services from your place in few steps.',
      image: '/Images/Desktop hero section images/andMore.webp'
    }
  ];

  return (
    <section className="desktop-only-hero" style={{
      backgroundColor: '#fff',
      padding: '20px 0 0px 0',
      overflow: 'hidden',
      display: 'none'
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

      {/* Cards Scrollable Container */}
      <div
        className="services-scroll-container"
        style={{
          display: 'flex',
          overflowX: 'auto',
          padding: '20px 40px 60px 40px',
          scrollSnapType: 'x mandatory',
          scrollBehavior: 'smooth'
        }}
      >
        {services.map((service, index) => (
          <ServiceCard
            key={service.id}
            title={service.title}
            description={service.description}
            image={service.image}
            onOrder={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ))}
      </div>
    </section>
  );
};

export default ServicesHeroSection;
