import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

const ComingSoon: React.FC = () => {
  const images = [
    '/Images/splash assets/Screenshot 2026-03-18 at 15.15.28.png',
    '/Images/splash assets/Screenshot 2026-03-18 at 15.15.36.png',
    '/Images/splash assets/Screenshot 2026-03-18 at 15.15.46.png',
    '/Images/splash assets/Screenshot 2026-03-18 at 15.15.53.png',
  ];

  // Double the images for seamless loop
  const doubledImages = [...images, ...images];

  return null;
};

export default ComingSoon;
