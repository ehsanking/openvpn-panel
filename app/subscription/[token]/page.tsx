'use client';

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function SubscriptionPage({ params }: { params: { token: string } }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/subscription/${params.token}`)
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [params.token]);

  if (loading) return <div>Loading...</div>;
  if (!data || data.error) return <div>Invalid subscription</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold">Subscription for {data.username}</h1>
      <div className="mt-4">
        <p>Status: {data.status}</p>
        <p>Traffic Used: {data.trafficUsage} GB</p>
        <p>Traffic Limit: {data.trafficLimit} GB</p>
        <p>Expires: {data.expiryDate}</p>
      </div>
      <div className="mt-8">
        <h2 className="text-xl">Scan QR Code:</h2>
        <QRCodeSVG value={`subscription://${params.token}`} />
      </div>
    </div>
  );
}
