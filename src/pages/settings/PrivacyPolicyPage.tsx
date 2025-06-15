
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const PrivacyPolicyPage: React.FC = () => (
  <div className="min-h-screen bg-gray-50">
    <div className="bg-white border-b sticky top-0 z-10">
      <div className="flex items-center gap-3 p-4">
        <Link to="/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold">Privacy Policy</h1>
        </div>
      </div>
    </div>
    <div className="p-6">
      <p>This is where your privacy policy will go.</p>
    </div>
  </div>
);

export default PrivacyPolicyPage;
