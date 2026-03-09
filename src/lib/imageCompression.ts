export interface CompressionOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    mimeType?: 'image/jpeg' | 'image/webp';
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.5,
    mimeType: 'image/jpeg',
};

export const isImageDataUrl = (value: string): boolean => {
    return /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(value || '');
};

export const readBlobAsDataUrl = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
        reader.readAsDataURL(blob);
    });
};

export const compressImageDataUrl = (dataUrl: string, options: CompressionOptions = {}): Promise<string> => {
    const { maxWidth, maxHeight, quality, mimeType } = { ...DEFAULT_OPTIONS, ...options };

    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement('canvas');
            let width = image.width;
            let height = image.height;

            if (width > height && width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            } else if (height >= width && height > maxHeight) {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
            }

            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext('2d');
            if (!context) {
                reject(new Error('Could not create canvas context'));
                return;
            }

            context.drawImage(image, 0, 0, width, height);
            resolve(canvas.toDataURL(mimeType, quality));
        };
        image.onerror = () => reject(new Error('Invalid image file'));
        image.src = dataUrl;
    });
};

export const compressImageFileToDataUrl = async (file: File, options: CompressionOptions = {}): Promise<string> => {
    const dataUrl = await readBlobAsDataUrl(file);
    return await compressImageDataUrl(dataUrl, options);
};

export const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
        const mimeType = match[1] || 'application/octet-stream';
        const base64 = match[2];
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i += 1) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return new Blob([bytes], { type: mimeType });
    }

    const response = await fetch(dataUrl);
    return await response.blob();
};
