export interface LocationPoint {
  lat: number;
  lng: number;
  address: string;
  city?: string;
  area?: string;
}

export type AddressLabel = 'Home' | 'Flat' | 'Garden' | 'Riad' | 'Guesthouse' | 'Hotel' | 'Office' | 'Other' | 'Custom';

export interface SavedAddress {
  id: string;
  label: AddressLabel;
  customLabel?: string;
  address: string;
  lat: number;
  lng: number;
  buildingName?: string;
  floorNumber?: string;
  doorNumber?: string;
  additionalInfo?: string;
  entranceLat?: number;
  entranceLng?: number;
}

export interface LocationPickerProps {
  mode: "single" | "double";
  serviceType: string;               // "move-in" | "cleaning" | "delivery" etc.
  serviceIcon?: string;              // emoji shown in address bar card
  title?: string;                    // "Where shall we deliver to?" etc.
  savedAddresses?: SavedAddress[];
  initialPickup?: LocationPoint;
  initialDropoff?: LocationPoint;
  onConfirm: (result: {
    pickup: LocationPoint;
    dropoff?: LocationPoint;
    savedAddress?: SavedAddress;
  }) => void;
  onClose?: () => void;
  autoLocate?: boolean;
  onSaveAddress?: (addr: SavedAddress) => void;
  onDeleteAddress?: (id: string) => void;
  isInline?: boolean;
  onConfirmRadius?: (radius: number) => void;
  initialRadius?: number;
  pinImage?: string;
}
