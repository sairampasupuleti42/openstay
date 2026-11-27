import { initializeApp } from 'firebase-admin/app';

initializeApp();

export {
  acceptHostParticipation,
  withdrawHostParticipation,
} from './hosting/host-participation.js';
