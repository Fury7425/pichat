import { useEffect, useRef } from 'react';
import { startWaku } from '@pichat/network';
import { useStore } from '../state/store';
import { useLogger } from '../utils/logger';

export function useWakuNode(): void {
  const started = useRef(false);
  const logger = useLogger('Waku');
  const identity = useStore((state) => state.identity);

  useEffect(() => {
    if (!identity || started.current) {
      return;
    }
    started.current = true;
    startWaku().catch((error) => {
      logger.error('Failed to start Waku node', error);
      started.current = false;
    });
  }, [identity, logger]);
}
