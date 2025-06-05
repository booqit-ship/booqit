
import React, { useEffect, useState } from 'react';
import { Toaster } from "@/components/ui/sonner";

const SafeToaster: React.FC = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return <Toaster />;
};

export default SafeToaster;
