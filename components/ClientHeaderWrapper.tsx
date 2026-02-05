'use client';

import Header from './Header';

interface ClientHeaderWrapperProps {
  user: any;
}

export default function ClientHeaderWrapper({ user }: ClientHeaderWrapperProps) {
  return <Header user={user} />;
}
