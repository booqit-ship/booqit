
import React from 'react';
import AppContent from '@/components/AppContent';
import ConnectionStatus from '@/components/ConnectionStatus';

const App: React.FC = () => {
  return (
    <>
      <ConnectionStatus />
      <AppContent />
    </>
  );
};

export default App;
