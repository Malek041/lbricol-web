import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    UserPlus, Shield, Star, MapPin,
    Wrench, DollarSign, Check, Copy,
    ChevronDown, Trash2, Plus
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/context/ToastContext';
import { translateBio } from '@/lib/translateBio';
import LocationPicker from '@/components/location-picker/LocationPicker';
import { COUNTRY_DATA, formatToE164, CountryConfig } from '@/lib/phoneUtils';
import CountrySelector from '@/components/phone/CountrySelector';

interface AdminBricolerCreatorProps {
    t: (vals: { en: string; fr: string }) => string;
    onBack?: () => void;
}

const AdminBricolerCreator: React.FC<AdminBricolerCreatorProps> = ({ t, onBack }) => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [result, setResult] = useState<{ metaId: string; claimCode: string } | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        city: 'Marrakech',
        phone: '',
        bio: '',
        rating: '0.0',
        jobsDone: '0',
        totalEarned: '0',
        services: [] as string[]
    });

    const [locationData, setLocationData] = useState<{ lat: number; lng: number; address: string } | null>(null);
    const [showLocationPicker, setShowLocationPicker] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState<CountryConfig>(COUNTRY_DATA[0]);

    const cities = ['Marrakech', 'Casablanca', 'Essaouira', 'Agadir', 'Rabat', 'Tangier'];
    const serviceCategories = [
        'Home repairs', 'Furniture assembly', 'Cleaning',
        'Glass Cleaning', 'Plumbing', 'Electricity', 'Painting'
    ];

    const generateCodes = () => {
        const metaId = 'meta_' + Math.random().toString(36).substr(2, 9).toUpperCase();
        const claimCode = 'CLAIM-' + Math.random().toString(36).substr(2, 6).toUpperCase();
        return { metaId, claimCode };
    };

    const toggleService = (service: string) => {
        setFormData(prev => ({
            ...prev,
            services: prev.services.includes(service)
                ? prev.services.filter(s => s !== service)
                : [...prev.services, service]
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { metaId, claimCode } = generateCodes();

        try {
            const bioTranslations = formData.bio ? await translateBio(formData.bio) : {};
            const e164Phone = formData.phone ? formatToE164(formData.phone, selectedCountry.dialCode) : '';
            const bricolerData = {
                name: formData.name,
                city: formData.city,
                phone: e164Phone,
                bio: formData.bio,
                base_lat: locationData?.lat || null,
                base_lng: locationData?.lng || null,
                base_address: locationData?.address || '',
                service_radius_km: 15,
                rating: Number(formData.rating),
                numReviews: Number(formData.jobsDone),
                completedJobs: Number(formData.jobsDone),
                totalEarnings: Number(formData.totalEarned),
                services: formData.services,
                isActive: true,
                isClaimed: false,
                claimCode: claimCode,
                metaId: metaId,
                routine: {
                    monday: { from: '08:30', to: '22:00', active: true },
                    tuesday: { from: '08:30', to: '22:00', active: true },
                    wednesday: { from: '08:30', to: '22:00', active: true },
                    thursday: { from: '08:30', to: '22:00', active: true },
                    friday: { from: '08:30', to: '22:00', active: true },
                    saturday: { from: '08:30', to: '22:00', active: true },
                    sunday: { from: '08:30', to: '22:00', active: true },
                },
                bio_translations: bioTranslations,
                createdAt: serverTimestamp(),
                uid: null // Not claimed yet
            };

            await setDoc(doc(db, 'bricolers', metaId), bricolerData);

            setResult({ metaId, claimCode });
            showToast({
                title: t({ en: 'Profile created successfully!', fr: 'Profil créé avec succès !' }),
                variant: 'success'
            });
        } catch (err) {
            console.error("Error creating phantom profile:", err);
            showToast({
                title: t({ en: 'Error creating profile', fr: 'Erreur lors de la création' }),
                variant: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (!result) return;
        const text = `Bricol Profile Created!\nName: ${formData.name}\nCity: ${formData.city}\nClaim Code: ${result.claimCode}\nMeta ID: ${result.metaId}`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (result) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-8 rounded-[40px] text-center"
            >
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <Check size={40} strokeWidth={3} />
                </div>
                <h2 className="text-2xl font-black text-black mb-2">{t({ en: 'Profile Created!', fr: 'Profil Créé !' })}</h2>
                <p className="text-neutral-500 mb-8">{t({ en: 'Send this code to the Bricoler for claiming.', fr: 'Envoyez ce code au Bricoleur pour réclamer le profil.' })}</p>

                <div className="space-y-4 mb-8">
                    <div className="bg-neutral-50 p-6 rounded-[32px] border border-neutral-100">
                        <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest mb-2">{t({ en: 'Claim Code', fr: 'Code de réclamation' })}</p>
                        <p className="text-3xl font-black text-black tracking-widest">{result.claimCode}</p>
                    </div>
                    <div className="bg-neutral-50 p-4 rounded-[24px]">
                        <p className="text-neutral-400 text-[10px] font-bold uppercase mb-1">{t({ en: 'Meta ID', fr: 'ID Meta' })}</p>
                        <p className="text-xs font-mono text-neutral-600">{result.metaId}</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleCopy}
                        className="flex-1 h-14 bg-neutral-100 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all hover:bg-neutral-200"
                    >
                        {copied ? <Check size={20} /> : <Copy size={20} />}
                        {copied ? t({ en: 'Copied', fr: 'Copié' }) : t({ en: 'Copy All', fr: 'Tout copier' })}
                    </button>
                    <button
                        onClick={() => {
                            setResult(null);
                            setFormData({ ...formData, name: '', phone: '', bio: '', services: [] });
                        }}
                        className="flex-1 h-14 bg-black text-white rounded-2xl font-bold transition-all hover:bg-black/90"
                    >
                        {t({ en: 'Create New', fr: 'Créer un nouveau' })}
                    </button>
                </div>
            </motion.div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-black mb-2 px-1">{t({ en: 'Full Name', fr: 'Nom complet' })}</label>
                    <input
                        required
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="w-full h-14 bg-neutral-50 rounded-2xl px-5 font-medium border-2 border-transparent focus:border-[#FFCC02] focus:bg-white transition-all outline-none"
                        placeholder={t({ en: 'e.g. Samir El Fassi', fr: 'ex. Samir El Fassi' })}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-black mb-2 px-1">{t({ en: 'City', fr: 'Ville' })}</label>
                        <select
                            value={formData.city}
                            onChange={e => setFormData({ ...formData, city: e.target.value })}
                            className="w-full h-14 bg-neutral-50 rounded-2xl px-5 font-medium outline-none appearance-none"
                        >
                            {cities.map(city => <option key={city} value={city}>{city}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-black mb-2 px-1">{t({ en: 'Phone (WA)', fr: 'Téléphone (WA)' })}</label>
                        <div className="flex gap-2 items-center bg-neutral-50 rounded-2xl border-2 border-transparent focus-within:border-[#FFCC02] focus-within:bg-white transition-all px-2 overflow-hidden">
                            <CountrySelector 
                                selectedCountry={selectedCountry} 
                                onSelect={setSelectedCountry}
                                isCompact={true}
                                fontSize="14px"
                            />
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                                className="flex-1 h-14 bg-transparent font-medium transition-all outline-none"
                                placeholder={selectedCountry.placeholder}
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-black mb-2 px-1">{t({ en: 'Services', fr: 'Services' })}</label>
                    <div className="flex flex-wrap gap-2">
                        {serviceCategories.map(cat => (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => toggleService(cat)}
                                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${formData.services.includes(cat)
                                    ? 'bg-[#FFCC02] text-black ring-2 ring-[#FFCC02] ring-offset-2'
                                    : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-[10px] font-bold text-neutral-400 mb-1 px-1 uppercase">{t({ en: 'Rating', fr: 'Note' })}</label>
                        <input
                            type="number"
                            step="0.1"
                            max="5"
                            value={formData.rating}
                            onChange={e => setFormData({ ...formData, rating: e.target.value })}
                            className="w-full h-12 bg-neutral-50 rounded-xl px-4 font-bold outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-neutral-400 mb-1 px-1 uppercase">{t({ en: 'Jobs', fr: 'Missions' })}</label>
                        <input
                            type="number"
                            value={formData.jobsDone}
                            onChange={e => setFormData({ ...formData, jobsDone: e.target.value })}
                            className="w-full h-12 bg-neutral-50 rounded-xl px-4 font-bold outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-neutral-400 mb-1 px-1 uppercase">{t({ en: 'Earnings', fr: 'Gains' })}</label>
                        <input
                            type="number"
                            value={formData.totalEarned}
                            onChange={e => setFormData({ ...formData, totalEarned: e.target.value })}
                            className="w-full h-12 bg-neutral-50 rounded-xl px-4 font-bold outline-none"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-black mb-2 px-1">{t({ en: 'Base Location', fr: 'Position de base' })}</label>
                    <button
                        type="button"
                        onClick={() => setShowLocationPicker(true)}
                        className={`w-full h-14 rounded-2xl border-2 flex items-center gap-3 px-5 transition-all ${locationData ? 'bg-[#01A083]/5 border-[#01A083] text-[#01A083]' : 'bg-neutral-50 border-transparent text-neutral-500'
                            }`}
                    >
                        <MapPin size={20} />
                        <span className="font-medium truncate flex-1 text-left">
                            {locationData ? locationData.address : t({ en: 'Pin location on map', fr: 'Épingler sur la carte' })}
                        </span>
                        {locationData && <Check size={18} />}
                    </button>
                </div>

                <div>
                    <label className="block text-sm font-bold text-black mb-2 px-1">{t({ en: 'Bio / Pitch', fr: 'Bio / Présentation' })}</label>
                    <textarea
                        value={formData.bio}
                        onChange={e => setFormData({ ...formData, bio: e.target.value })}
                        className="w-full h-32 bg-neutral-50 rounded-2xl p-5 font-medium border-2 border-transparent focus:border-[#FFCC02] focus:bg-white transition-all outline-none resize-none"
                        placeholder={t({ en: 'Write a short pitch...', fr: 'Écrivez une courte présentation...' })}
                    />
                </div>
            </div>

            <button
                disabled={loading || !formData.name || formData.services.length === 0}
                className="w-full h-16 bg-black text-white rounded-[24px] font-black text-lg shadow-lg shadow-black/10 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
                {loading ? '...' : (
                    <>
                        <UserPlus size={20} />
                        {t({ en: 'Create Shadow Profile', fr: 'Créer un profil provisoire' })}
                    </>
                )}
            </button>
            {showLocationPicker && (
                <div className="fixed inset-0 z-[1100] bg-white">
                    <LocationPicker
                        mode="single"
                        serviceType="bricoler-base"
                        serviceIcon="📍"
                        autoLocate={true}
                        onClose={() => setShowLocationPicker(false)}
                        isInline={true}
                        onConfirm={({ pickup }) => {
                            setLocationData({
                                lat: pickup.lat,
                                lng: pickup.lng,
                                address: pickup.address || ''
                            });
                            if (pickup.city) {
                                setFormData(prev => ({ ...prev, city: pickup.city || prev.city }));
                            }
                            setShowLocationPicker(false);
                        }}
                    />
                </div>
            )}
        </form>
    );
};

export default AdminBricolerCreator;
