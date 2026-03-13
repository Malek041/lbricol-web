export interface CarModel {
    id: string;
    name: string;
    image: string;
}

export interface CarBrand {
    id: string;
    name: string;
    logo: string;
    models: CarModel[];
}

export const CAR_BRANDS: CarBrand[] = [
    {
        id: 'toyota',
        name: 'Toyota',
        logo: '/Images/Cars.png/Toyota/Toyota.png',
        models: [
            { id: 'camry', name: 'Camry', image: '/Images/Cars.png/Toyota/Toyota Camry Background Removed.png' },
            { id: 'corolla', name: 'Corolla Prestige', image: '/Images/Cars.png/Toyota/Toyota corolla Prestige Background Removed.png' },
            { id: 'fortuner', name: 'Fortuner', image: '/Images/Cars.png/Toyota/Toyota Fortuner Background Removed.png' },
            { id: 'land_cruiser_300', name: 'Land Cruiser 300', image: '/Images/Cars.png/Toyota/Toyota Land cruiser 300 Background Removed.png' },
            { id: 'hilux', name: 'Hilux', image: '/Images/Cars.png/Toyota/Toyota Hilux Background Removed.png' },
            { id: 'chr', name: 'C-HR', image: '/Images/Cars.png/Toyota/Toyota C-HR Background Removed.png' },
        ]
    },
    {
        id: 'mercedes',
        name: 'Mercedes-Benz',
        logo: '/Images/Cars.png/Mercedes/Mercedes.png',
        models: [
            { id: 'classe_a', name: 'Classe A', image: '/Images/Cars.png/Mercedes/Mercedes-BenzClasse A Background Removed.png' },
            { id: 'classe_c', name: 'Classe C', image: '/Images/Cars.png/Mercedes/Mercedes-BenzClasse C Background Removed.png' },
            { id: 'classe_e', name: 'Classe E', image: '/Images/Cars.png/Mercedes/Mercedes-BenzClasse E Background Removed.png' },
            { id: 'classe_s', name: 'Classe S', image: '/Images/Cars.png/Mercedes/Mercedes-BenzClasse S Background Removed.png' },
            { id: 'glc', name: 'GLC', image: '/Images/Cars.png/Mercedes/Mercedes-BenzGLC Background Removed.png' },
            { id: 'gla', name: 'GLA', image: '/Images/Cars.png/Mercedes/Mercedes-BenzGLA Background Removed.png' },
        ]
    },
    {
        id: 'dacia',
        name: 'Dacia',
        logo: '/Images/Cars.png/Dacia/Dacia-logo.png',
        models: [
            { id: 'duster', name: 'Duster', image: '/Images/Cars.png/Dacia/Dacia Duster.png' },
            { id: 'sandero', name: 'Sandero', image: '/Images/Cars.png/Dacia/Dacia Sandero.png' },
            { id: 'lodgy', name: 'Lodgy', image: '/Images/Cars.png/Dacia/Dacia Lodgy.png' },
            { id: 'spring', name: 'Spring', image: '/Images/Cars.png/Dacia/acia-Spring.png' },
            { id: 'dokker', name: 'Dokker', image: '/Images/Cars.png/Dacia/Dokker Stepway.png' },
        ]
    },
    {
        id: 'peugeot',
        name: 'Peugeot',
        logo: '/Images/Cars.png/Peugeot/peugeot.png',
        models: [
            { id: '208', name: '208', image: '/Images/Cars.png/Peugeot/peugeot 208 Background Removed.png' },
            { id: '3008', name: '3008', image: '/Images/Cars.png/Peugeot/peugeot 3008 Background Removed.png' },
            { id: '5008', name: '5008', image: '/Images/Cars.png/Peugeot/peugeot 5008 Background Removed.png' },
            { id: '2008', name: '2008 SUV', image: '/Images/Cars.png/Peugeot/peugeot 2008 SUV Background Removed.png' },
            { id: 'rifter', name: 'Rifter', image: '/Images/Cars.png/Peugeot/peugeot Rifter Background Removed.png' },
            { id: 'partner', name: 'Partner', image: '/Images/Cars.png/Peugeot/peugeot Partner Background Removed.png' },
        ]
    },
    {
        id: 'renault',
        name: 'Renault',
        logo: '/Images/Cars.png/Renault/Renault-logo.png',
        models: [
            { id: 'clio', name: 'Clio', image: '/Images/Cars.png/Renault/Clio-removebg-preview.png' },
            { id: 'kadjar', name: 'Kadjar', image: '/Images/Cars.png/Renault/Kadjar-removebg-preview.png' },
            { id: 'kwid', name: 'Kwid', image: '/Images/Cars.png/Renault/Renault Kwid Background Removed.png' },
            { id: 'kardian', name: 'Kardian', image: '/Images/Cars.png/Renault/renault-kardian-image-promotion-maroc-novembre-2025-maroc-autonews Background Removed.png' },
        ]
    },
    {
        id: 'volkswagen',
        name: 'Volkswagen',
        logo: '/Images/Cars.png/Volkswagen/VW Logo.png',
        models: [
            { id: 'golf_8', name: 'Golf 8', image: '/Images/Cars.png/Volkswagen/Volkswagen Golf 8 Background Removed.png' },
            { id: 'polo', name: 'Polo', image: '/Images/Cars.png/Volkswagen/Volkswagen Polo Background Removed.png' },
            { id: 'tiguan', name: 'Tiguan', image: '/Images/Cars.png/Volkswagen/Volkswagen Tiguan Background Removed.png' },
            { id: 'touareg', name: 'Touareg', image: '/Images/Cars.png/Volkswagen/Volkswagen Touareg Background Removed.png' },
            { id: 'caddy', name: 'Caddy 5', image: '/Images/Cars.png/Volkswagen/Volkswagen caddy 5  Background Removed.png' },
        ]
    },
    {
        id: 'fiat',
        name: 'Fiat',
        logo: '/Images/Cars.png/Fiat/Fiat.png',
        models: [
            { id: '500', name: '500', image: '/Images/Cars.png/Fiat/Fiat_500-removebg-preview.png' },
            { id: 'tipo', name: 'Tipo', image: '/Images/Cars.png/Fiat/Fiat_Tipo-removebg-preview.png' },
            { id: 'doblo', name: 'Doblo', image: '/Images/Cars.png/Fiat/Fiat_Doblo-removebg-preview.png' },
            { id: 'panda', name: 'Panda', image: '/Images/Cars.png/Fiat/Fiat_Panda-removebg-preview.png' },
            { id: 'scudo', name: 'Scudo', image: '/Images/Cars.png/Fiat/Fiat Scudo.webp' },
        ]
    },
    {
        id: 'nissan',
        name: 'Nissan',
        logo: '/Images/Cars.png/Nissan/nissan-logo-2020-black (1).png',
        models: [
            { id: 'qashqai', name: 'Qashqai', image: '/Images/Cars.png/Nissan/Nissan Qashqai Background Removed.png' },
            { id: 'juke', name: 'Juke', image: '/Images/Cars.png/Nissan/Nissan Juke Background Removed.png' },
            { id: 'patrol', name: 'Patrol', image: '/Images/Cars.png/Nissan/Nissan Patrol Background Removed.png' },
            { id: 'altima', name: 'Altima', image: '/Images/Cars.png/Nissan/Nissan Altima Background Removed.png' },
        ]
    }
];
