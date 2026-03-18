'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

interface LocationPoint {
  lat: number;
  lng: number;
  address: string;
}

interface OrderState {
  serviceType: string;
  serviceName: string;
  subServiceId: string;
  subServiceName: string;
  location: LocationPoint | null;
  providerId: string | null;
  providerName: string | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
}

interface OrderContextType {
  order: OrderState;
  setOrderField: (key: keyof OrderState, value: any) => void;
  resetOrder: () => void;
}

const defaultOrder: OrderState = {
  serviceType: '',
  serviceName: '',
  subServiceId: '',
  subServiceName: '',
  location: null,
  providerId: null,
  providerName: null,
  scheduledDate: null,
  scheduledTime: null,
};

const OrderContext = createContext<OrderContextType | null>(null);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [order, setOrder] = useState<OrderState>(defaultOrder);

  const setOrderField = (key: keyof OrderState, value: any) => {
    setOrder(prev => ({ ...prev, [key]: value }));
  };

  const resetOrder = () => setOrder(defaultOrder);

  return (
    <OrderContext.Provider value={{ order, setOrderField, resetOrder }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrder() {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error('useOrder must be used within OrderProvider');
  return ctx;
}
