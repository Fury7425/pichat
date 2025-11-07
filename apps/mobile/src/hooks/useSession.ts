import { useEffect } from 'react';
import { ensureSession } from '@pichat/crypto';
import { useLogger } from '../utils/logger';

export function useSession(peerPublicKey?: string): void {
  const logger = useLogger('Session');
  useEffect(() => {
    if (!peerPublicKey) {
      return;
    }
    ensureSession(peerPublicKey).catch((error) => logger.error('ensureSession failed', error));
  }, [peerPublicKey, logger]);
}
