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
            const bricolerData = {
                name: formData.name,
                city: formData.city,
                phone: formData.phone,
                bio: formData.bio,
                rating: Number(formData.rating),
                numReviews: Number(formData.jobsDone),
                completedJobs: Number(formData.jobsDone),
                totalEarnings: Number(formData.totalEarned),
                services: formData.services,
                isActive: true,
                isClaimed: false,
                claimCode: claimCode,
                metaId: metaId,
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
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full h-14 bg-neutral-50 rounded-2xl px-5 font-medium border-2 border-transparent focus:border-[#FFCC02] focus:bg-white transition-all outline-none"
                            placeholder={t({ en: '+212...', fr: '+212...' })}
                        />
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
        </form>
    );
};

export default AdminBricolerCreator;
