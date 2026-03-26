import React from 'react';

interface WaveTopProps {
    className?: string;
    fill?: string;
}

const WaveTop: React.FC<WaveTopProps> = ({ className, fill = "white" }) => {
    return (
        <div className={`absolute top-[-44px] left-0 right-0 h-[45px] z-20 pointer-events-none ${className || ''}`}>
            <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="w-full h-full drop-shadow-[0_-5px_10px_rgba(0,0,0,0.03)]" style={{ fill }}>
                <path d="M0,64L48,64C96,64,192,64,288,64C384,64,480,64,576,53.3C672,43,768,21,864,16C960,10.7,1056,21.3,1152,42.7C1248,64,1344,96,1392,112L1440,128L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"></path>
            </svg>
        </div>
    );
};

export default WaveTop;
