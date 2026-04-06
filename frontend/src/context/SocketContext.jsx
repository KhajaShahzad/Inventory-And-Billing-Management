import { useEffect, useMemo } from 'react';
import { io } from 'socket.io-client';
import { socketUrl } from '../services/config';
import { SocketContext } from './SocketContextValue';

export const SocketProvider = ({ children }) => {
  const socket = useMemo(() => io(socketUrl, { transports: ['websocket', 'polling'] }), []);

  useEffect(() => () => {
    socket.close();
  }, [socket]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
