import { OrderDetails } from '@/features/orders/components/OrderCard';

export interface UserData {
    uid: string;
    email: string | null;
    name: string | null;
    whatsappNumber?: string;
    isProvider: boolean;
    services: string[] | { serviceId: string; serviceName: string; subServices: string[] }[];
    city: string;
    nidDetails?: any;
    rating?: number;
    completedJobs?: number;
    jobsDone?: number;
    isVerified?: boolean;
    isActive?: boolean;
    workAreas?: string[];
    quickPitch?: string;
    bio?: string;
    bio_translations?: { en?: string; fr?: string; ar?: string };
    calendarSlots?: Record<string, { from: string; to: string }[]>;
    photoURL?: string;
    avatar?: string;
    profilePhotoURL?: string;
    googlePhotoURL?: string;
    routine?: Record<string, { active: boolean; from: string; to: string }>;
}

export interface Job {
    id: string;
    clientName: string;
    clientAvatar: string;
    craft: string;
    title: string;
    price: string | number;
    rating: number;
    description: string;
    timestamp: string;
    date: string;
    image?: string;
    city: string;
    duration?: string;
    createdAt?: any;
    offers?: any[];
    clientId?: string;
    images?: string[];
    serviceId?: string;
    subService?: string;
    subServiceDisplayName?: string;
    time?: string;
    status: string;
    basePrice?: number | string;
    area?: string;
    clientWhatsApp?: string;
    locationDetails?: any;
    expectedEndTime?: any;
}

export type MobileJobsStatus = 'new' | 'waiting' | 'programmed' | 'done' | 'delivered';

export interface MobileJobsViewItem {
    id: string;
    kind: 'market' | 'accepted';
    status: MobileJobsStatus;
    statusLabel: string;
    clientName: string;
    clientAvatar?: string;
    duration?: string;
    clientRating?: number;
    clientReviewCount?: number;
    city: string;
    service: string;
    subService: string;
    subServiceDisplayName?: string;
    dateLabel: string;
    timeLabel: string;
    priceLabel: string;
    image: string;
    description?: string;
    images?: string[];
    rawJob?: Job;
    rawAccepted?: OrderDetails;
    isUrgent?: boolean;
    clientWhatsApp?: string;
    selectedCar?: any;
    carReturnDate?: string;
    carReturnTime?: string;
    totalPrice?: number;
}
