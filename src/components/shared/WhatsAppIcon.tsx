import React from 'react';

interface WhatsAppBrandIconProps {
    size?: number;
    className?: string;
    fill?: string;
}

export const WhatsAppBrandIcon: React.FC<WhatsAppBrandIconProps> = ({
    size = 20,
    className = "",
}) => (
    <img
        src="/Images/Icons/Whatsapp logo icon.png"
        alt="WhatsApp"
        width={size}
        height={size}
        className={className}
        style={{ objectFit: 'contain' }}
    />
);
