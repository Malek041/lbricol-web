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

  return (
    <div className="fixed inset-0 z-[99999] bg-[#FFB700] flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Upper Spacing */}
      <div className="flex-1" />

      {/* Marquee Section */}
      <div className="relative w-screen overflow-hidden py-10">
        <motion.div
          className="flex gap-4 px-4 w-max"
          animate={{ x: ["0%", "-50%"] }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {doubledImages.map((src, idx) => (
            <div
              key={idx}
              className="w-[280px] h-[480px] rounded-[20px] overflow-hidden shrink-0 relative"
            >
              <Image
                src={src}
                alt={`Splash ${idx}`}
                fill
                priority={idx < 4}
                quality={80}
                sizes="280px"
                className="object-cover"
              />
            </div>
          ))}
        </motion.div>
      </div>

      {/* Lower Section */}
      <div className="flex-1 flex flex-col items-center justify-start pt-12 text-center">


        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-[#027C3E] text-4xl md:text-6xl font-black tracking-tighter"
        >
          Coming Soon...
        </motion.h1>
      </div>
    </div>
  );
};

export default ComingSoon;
