import React from 'react';
import { RegistrantItem, SessionItem } from '../../types';

export interface GuestDigitalPassModalProps {
  isOpen: boolean;
  registrant: RegistrantItem;
  session?: SessionItem;
  onClose: () => void;
  onNotify: (msg: string) => void;
}

export const GuestDigitalPassModal: React.FC<GuestDigitalPassModalProps> = () => null;
