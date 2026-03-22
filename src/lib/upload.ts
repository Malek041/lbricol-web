import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export const uploadToCloudinary = async (dataUrl: string, folder: string, preset: string) => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    if (!cloudName) {
        console.error("Cloudinary Error: NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is missing in env");
        throw new Error('Cloud Name is not configured');
    }
    
    const formData = new FormData();
    formData.append('file', dataUrl);
    formData.append('upload_preset', preset);
    formData.append('folder', folder);
    
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData
    });
    
    if (!res.ok) {
        const errorDetails = await res.json().catch(() => ({}));
        console.error("Cloudinary upload failed:", {
            status: res.status,
            statusText: res.statusText,
            details: errorDetails,
            preset,
            folder,
            cloudName
        });
        throw new Error(`Cloudinary upload failed: ${res.statusText}`);
    }
    
    const data = await res.json();
    return data.secure_url;
};

export const uploadToFirebase = async (dataUrl: string, path: string) => {
    try {
        const storageRef = ref(storage, path);
        await uploadString(storageRef, dataUrl, 'data_url');
        return await getDownloadURL(storageRef);
    } catch (error) {
        console.error("Firebase upload failed:", error);
        throw error;
    }
};
