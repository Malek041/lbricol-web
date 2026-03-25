"use client";

import React from 'react';
import Header from '@/components/layout/Header';
import { useLanguage } from '@/context/LanguageContext';
import { motion } from 'framer-motion';
import { Shield, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

const PrivacyPolicy = () => {
    const { t } = useLanguage();
    const router = useRouter();

    return (
        <div className="min-h-screen bg-white">
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-neutral-100 flex items-center justify-between px-6 py-4">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-black active:scale-90 transition-transform"
                >
                    <ChevronLeft size={20} strokeWidth={2.5} />
                </button>
                <h1 className="text-sm font-black tracking-tight uppercase">Privacy Policy</h1>
                <div className="w-10 h-10" /> {/* Spacer */}
            </div>

            <div className="max-w-2xl mx-auto px-6 py-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center text-center mb-12"
                >
                    <div className="w-16 h-16 rounded-3xl bg-[#219178]/10 flex items-center justify-center text-[#219178] mb-6">
                        <Shield size={32} />
                    </div>
                    <h2 className="text-3xl font-black text-black leading-tight mb-4">
                        {t({ en: 'Your Privacy Matters', fr: 'Votre vie privée compte' })}
                    </h2>
                    <p className="text-neutral-500 font-medium leading-relaxed">
                        {t({
                            en: 'We are committed to protecting your personal data and being transparent about how we use it.',
                            fr: 'Nous nous engageons à protéger vos données personnelles et à être transparents sur la manière dont nous les utilisons.'
                        })}
                    </p>
                </motion.div>

                <div className="space-y-10 text-neutral-800">
                    <section>
                        <h3 className="text-lg font-black mb-3">1. Information We Collect</h3>
                        <p className="font-medium text-neutral-600 leading-relaxed mb-4">
                            When you use Lbricol, we collect information you provide directly, such as your name, email address (via Google Login), phone number (WhatsApp), and location details when you post a mission.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-black mb-3">2. How We Use Information</h3>
                        <p className="font-medium text-neutral-600 leading-relaxed mb-4">
                            We use your information to facilitate the matching process between clients and service providers, process payments, and improve our services. Your contact information is only shared with a provider once you accept their offer.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-black mb-3">3. Data Sharing</h3>
                        <p className="font-medium text-neutral-600 leading-relaxed mb-4">
                            We do not sell your personal data. We share information only with service providers you choose to interact with and essential third-party services (like Firebase or payment processors) required to operate the platform.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-black mb-3">4. Your Rights</h3>
                        <p className="font-medium text-neutral-600 leading-relaxed mb-4">
                            In accordance with Law No. 09-08 relating to the protection of individuals with regard to the processing of personal data, you have the right to access, rectify, and oppose the processing of your data.
                        </p>
                    </section>

                    <section className="pt-8 border-t border-neutral-100">
                        <p className="text-[14px] text-neutral-400 font-bold uppercase tracking-wider">
                            Last updated: March 3, 2026
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
