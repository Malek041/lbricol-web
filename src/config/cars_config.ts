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
            { id: 'fortuner_legender', name: 'Fortuner Legender', image: '/Images/Cars.png/Toyota/Toyota Fortuner Legender Background Removed.png' },
            { id: 'land_cruiser_300', name: 'Land Cruiser 300', image: '/Images/Cars.png/Toyota/Toyota Land cruiser 300 Background Removed.png' },
            { id: 'land_cruiser_250', name: 'Land Cruiser 250', image: '/Images/Cars.png/Toyota/Toyota Land Cruiser 250 Background Removed.png' },
            { id: 'hilux', name: 'Hilux', image: '/Images/Cars.png/Toyota/Toyota Hilux Background Removed.png' },
            { id: 'chr', name: 'C-HR', image: '/Images/Cars.png/Toyota/Toyota C-HR Background Removed.png' },
            { id: 'chr_hybrid', name: 'C-HR Hybrid', image: '/Images/Cars.png/Toyota/toyota-c-hr Hybrid Background Removed.png' },
            { id: 'yaris_cross', name: 'Yaris Cross', image: '/Images/Cars.png/Toyota/Toyota Yariss Cross Background Removed.png' },
            { id: 'taisor', name: 'Taisor', image: '/Images/Cars.png/Toyota/Toyota Taisor Background Removed.png' },
            { id: 'innova', name: 'Innova Hycross', image: '/Images/Cars.png/Toyota/Toyota Innova Hycross Background Removed.png' },
            { id: 'urban_cruiser', name: 'Urban Cruiser Hyryder', image: '/Images/Cars.png/Toyota/Toyota Urban Cruiser Hyryder Background Removed.png' },
            { id: 'vellfire', name: 'Vellfire', image: '/Images/Cars.png/Toyota/Toyota Vellfire Background Removed.png' },
            { id: '4runner', name: '4Runner', image: '/Images/Cars.png/Toyota/Toyota 4Runner Background Removed.png' },
            { id: 'rumion', name: 'Rumion', image: '/Images/Cars.png/Toyota/Toyota Rumion Background Removed.png' },
            { id: 'glanza', name: 'Glanza', image: '/Images/Cars.png/Toyota/Toyota Glanza Background Removed.png' },
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
            { id: 'eqe', name: 'EQE', image: '/Images/Cars.png/Mercedes/Mercedes-BenzEQE Background Removed.png' },
            { id: 'classe_g', name: 'Classe G', image: '/Images/Cars.png/Mercedes/mercedes_benz Class_G.png' },
        ]
    },
    {
        id: 'dacia',
        name: 'Dacia',
        logo: '/Images/Cars.png/Dacia/Dacia-logo.png',
        models: [
            { id: 'duster', name: 'Duster', image: '/Images/Cars.png/Dacia/Dacia Duster.png' },
            { id: 'duster_2026', name: 'Duster 2026', image: '/Images/Cars.png/Dacia/dacia_duster_2026.png' },
            { id: 'sandero', name: 'Sandero', image: '/Images/Cars.png/Dacia/Dacia Sandero.png' },
            { id: 'sandero_stepway', name: 'Sandero Stepway', image: '/Images/Cars.png/Dacia/dacia-sandero-stepway-2.png' },
            { id: 'logan_2025', name: 'Logan 2025', image: '/Images/Cars.png/Dacia/dacia_logan_2025.webp' },
            { id: 'jogger', name: 'Jogger', image: '/Images/Cars.png/Dacia/dacia jogger.png' },
            { id: 'lodgy', name: 'Lodgy', image: '/Images/Cars.png/Dacia/Dacia Lodgy.png' },
            { id: 'spring', name: 'Spring', image: '/Images/Cars.png/Dacia/Dacia_spring.png' },
            { id: 'dokker', name: 'Dokker', image: '/Images/Cars.png/Dacia/dacia-dokker.png' },
            { id: 'dokker_stepway', name: 'Dokker Stepway', image: '/Images/Cars.png/Dacia/Dokker Stepway.png' },
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
            { id: '508_gt', name: '508 GT', image: '/Images/Cars.png/Peugeot/peugeot 508 GT Background Removed.png' },
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
            { id: 'clio_4', name: 'Clio 4', image: '/Images/Cars.png/Renault/Clio_4-removebg-preview.png' },
            { id: 'clio_hybrid', name: 'Clio E-TECH', image: '/Images/Cars.png/Renault/Clio_E-TECH_Hybrid-removebg-preview.png' },
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
            { id: 'golf_8_2026', name: 'Golf 8 (2026)', image: '/Images/Cars.png/Volkswagen/Volkswagen Golf 8 Neuve 2026 Background Removed.png' },
            { id: 'polo', name: 'Polo', image: '/Images/Cars.png/Volkswagen/Volkswagen Polo Background Removed.png' },
            { id: 'tiguan', name: 'Tiguan', image: '/Images/Cars.png/Volkswagen/Volkswagen Tiguan Background Removed.png' },
            { id: 'touareg', name: 'Touareg', image: '/Images/Cars.png/Volkswagen/Volkswagen Touareg Background Removed.png' },
            { id: 't-cross', name: 'T-Cross', image: '/Images/Cars.png/Volkswagen/Volkswagen T-Cross Background Removed.png' },
            { id: 'arteon', name: 'Arteon', image: '/Images/Cars.png/Volkswagen/Volkswagen Arteon Background Removed.png' },
            { id: 'beetle', name: 'Beetle', image: '/Images/Cars.png/Volkswagen/Volkswagen Beetle Background Removed.png' },
            { id: 'caddy', name: 'Caddy 5', image: '/Images/Cars.png/Volkswagen/Volkswagen caddy 5  Background Removed.png' },
        ]
    },
    {
        id: 'fiat',
        name: 'Fiat',
        logo: '/Images/Cars.png/Fiat/Fiat_logo.png',
        models: [
            { id: '500', name: '500', image: '/Images/Cars.png/Fiat/Fiat_500.png' },
            { id: '500_2024', name: '500 (2024)', image: '/Images/Cars.png/Fiat/Fiat_500_2024.png' },
            { id: '500x', name: '500X', image: '/Images/Cars.png/Fiat/Fiat_500X.png' },
            { id: '500x_cabrio', name: '500X Cabrio', image: '/Images/Cars.png/Fiat/Fiat_500X_Cabrio.png' },
            { id: '600_hybrid', name: '600 Hybride', image: '/Images/Cars.png/Fiat/Fiat_600_Hybride.png' },
            { id: 'tipo', name: 'Tipo', image: '/Images/Cars.png/Fiat/Fiat_Tipo.png' },
            { id: 'panda', name: 'Panda', image: '/Images/Cars.png/Fiat/Fiat_Panda.png' },
            { id: 'topolino', name: 'Topolino', image: '/Images/Cars.png/Fiat/Fiat_Topolino.png' },
            { id: 'doblo', name: 'Doblo', image: '/Images/Cars.png/Fiat/Fiat_Doblo.png' },
            { id: 'fiorino', name: 'Fiorino Combi', image: '/Images/Cars.png/Fiat/Fiat_Fiorino_Combi.png' },
            { id: 'scudo', name: 'Scudo', image: '/Images/Cars.png/Fiat/Fiat Scudo.webp' },
            { id: 'ducato', name: 'Ducato', image: '/Images/Cars.png/Fiat/Fiat Ducato.webp' },
            { id: 'fullback', name: 'Fullback', image: '/Images/Cars.png/Fiat/Fiat_fullback.png' },
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
            { id: 'sentra', name: 'Sentra', image: '/Images/Cars.png/Nissan/Nissan Sentra Background Removed.png' },
            { id: 'altima', name: 'Altima', image: '/Images/Cars.png/Nissan/Nissan Altima Background Removed.png' },
        ]
    },
    {
        id: 'skoda',
        name: 'Skoda',
        logo: '/Images/Cars.png/Skoda/Skoda.png',
        models: [
            { id: 'octavia', name: 'Octavia', image: '/Images/Cars.png/Skoda/Skoda Octavia Background Removed.png' },
            { id: 'fabia', name: 'Fabia', image: '/Images/Cars.png/Skoda/Skoda fabia Background Removed.png' },
            { id: 'scala', name: 'Scala', image: '/Images/Cars.png/Skoda/Skoda scala Background Removed.png' },
            { id: 'karoq', name: 'Karoq', image: '/Images/Cars.png/Skoda/Skoda KAROQ Background Removed.png' },
            { id: 'kamiq', name: 'Kamiq', image: '/Images/Cars.png/Skoda/Skoda kmiq Background Removed.png' },
            { id: 'kushaq', name: 'Kushaq', image: '/Images/Cars.png/Skoda/Skoda Kushaq Background Removed.png' },
            { id: 'slavia', name: 'Slavia', image: '/Images/Cars.png/Skoda/Skoda slavia Background Removed.png' },
        ]
    },
    {
        id: 'seat',
        name: 'Seat',
        logo: '/Images/Cars.png/Seat/seat-logo.png',
        models: [
            { id: 'ibiza', name: 'Ibiza', image: '/Images/Cars.png/Seat/Seat ibiza.png' },
            { id: 'leon', name: 'Leon', image: '/Images/Cars.png/Seat/seat-leon.webp' },
            { id: 'arona', name: 'Arona', image: '/Images/Cars.png/Seat/Seat Arona Background Removed.png' },
            { id: 'ateca', name: 'Ateca', image: '/Images/Cars.png/Seat/Seat Ateca Background Removed.png' },
        ]
    },
    {
        id: 'byd',
        name: 'BYD',
        logo: '/Images/Cars.png/BYD/BYD logo.png',
        models: [
            { id: 'seal_5', name: 'Seal 5 PHEV', image: '/Images/Cars.png/BYD/BYD_SEAL_5_PHEV-removebg-preview.png' },
            { id: 'seal_u', name: 'Seal U', image: '/Images/Cars.png/BYD/BYD_SeaL_U-removebg-preview.png' },
            { id: 'atto_3', name: 'Atto 3', image: '/Images/Cars.png/BYD/BYD_Atto_3_2025-removebg-preview.png' },
            { id: 'han_ev', name: 'Han EV', image: '/Images/Cars.png/BYD/BYD_s_Flagship_Han_EV-removebg-preview.png' },
        ]
    },
    {
        id: 'citroen',
        name: 'Citroën',
        logo: '/Images/Cars.png/Citreon/Citroen logo.jpg',
        models: [
            { id: 'c3', name: 'C3', image: '/Images/Cars.png/Citreon/Citroen C3.jpeg' },
            { id: 'c3_x', name: 'C3 X', image: '/Images/Cars.png/Citreon/Citreon C3 X.avif' },
            { id: 'ec3', name: 'ë-C3', image: '/Images/Cars.png/Citreon/Citreon eC3.jpg' },
            { id: 'c4', name: 'C4', image: '/Images/Cars.png/Citreon/Citreon C4.avif' },
            { id: 'ami', name: 'Ami', image: '/Images/Cars.png/Citreon/Citreon ami.avif' },
        ]
    },
    {
        id: 'honda',
        name: 'Honda',
        logo: '/Images/Cars.png/Honda/Honda-logo.png',
        models: [
            { id: 'civic', name: 'Civic', image: '/Images/Cars.png/Honda/honda civic.webp' },
            { id: 'accord', name: 'Accord', image: '/Images/Cars.png/Honda/honda_Accord_Family_Card_Jelly_2x.avif' },
            { id: 'accord_sedan_lx', name: 'Accord Sedan LX', image: '/Images/Cars.png/Honda/Honda Accord Sedan LX.avif' },
            { id: 'crv_2026', name: 'CR-V 2026', image: '/Images/Cars.png/Honda/2026 Honda CR-V.avif' },
            { id: 'pilot', name: 'Pilot', image: '/Images/Cars.png/Honda/Honda Pilot.avif' },
            { id: 'jazz', name: 'Jazz', image: '/Images/Cars.png/Honda/honda jazz.png' },
            { id: 'lineup', name: 'Lineup', image: '/Images/Cars.png/Honda/Honda Lineup.avif' },
        ]
    },
    {
        id: 'opel',
        name: 'Opel',
        logo: '/Images/Cars.png/Opel/opel logo.jpg',
        models: [
            { id: 'corsa', name: 'Corsa', image: '/Images/Cars.png/Opel/opel corsa.png' },
            { id: 'astra', name: 'Astra', image: '/Images/Cars.png/Opel/opel astra.png' },
            { id: 'astra_sports_tourer_electric', name: 'Astra Sports Tourer Electric', image: '/Images/Cars.png/Opel/Opel Astra Sports Tourer Electric.png' },
            { id: 'mokka', name: 'Mokka', image: '/Images/Cars.png/Opel/opel mokka.avif' },
            { id: 'grandland', name: 'Grandland', image: '/Images/Cars.png/Opel/Opel Grandland crossover SUV.png' },
            { id: 'adam_rocks', name: 'Adam Rocks', image: '/Images/Cars.png/Opel/Opel Adam Rocks.png' },
        ]
    }
];
