
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Alert, AlertDescription } from '../components/ui/alert';

type SubscriberData = {
  email: string;
  name: string;
  status: 'active' | 'unsubscribed';
};

export default function UnsubscribePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isUnsubscribed, setIsUnsubscribed] = useState(false);
  const [reason, setReason] = useState('');
  const [subscriberData, setSubscriberData] = useState<SubscriberData | null>(null);

  const token = new URLSearchParams(window.location.search).get('token');

  useEffect(() => {
    async function validateToken() {
      try {
        setIsLoading(true);
        setError(null);

        if (!token) {
          throw new Error('Missing unsubscribe token');
        }

        const response = await fetch(`/api/subscribers/unsubscribe/${token}`);
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to validate unsubscribe link');
        }

        setSubscriberData(data.data);
        setIsValidToken(true);
        setIsUnsubscribed(data.data.status === 'unsubscribed');
      } catch (err) {
        console.error('Token validation error:', err);
        setError(err instanceof Error ? err.message : 'Failed to validate unsubscribe link');
        setIsValidToken(false);
      } finally {
        setIsLoading(false);
      }
    }

    validateToken();
  }, [token]);

  const handleUnsubscribe = async () => {
    try {
      setError(null);
      const response = await fetch(`/api/subscribers/unsubscribe/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to unsubscribe');
      }

      setIsUnsubscribed(true);
    } catch (err) {
      console.error('Unsubscribe error:', err);
      setError(err instanceof Error ? err.message : 'Failed to unsubscribe');
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Invalid Unsubscribe Link</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>
            {isUnsubscribed ? 'Successfully Unsubscribed' : 'Unsubscribe from Newsletter'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isUnsubscribed ? (
            <div className="space-y-4">
              <p>You have been successfully unsubscribed from our newsletter.</p>
              {subscriberData?.email && (
                <p className="text-sm text-gray-500">Email: {subscriberData.email}</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p>We're sorry to see you go. Would you mind telling us why you're unsubscribing?</p>
              {subscriberData?.email && (
                <p className="text-sm text-gray-500">Email: {subscriberData.email}</p>
              )}
              <Textarea
                placeholder="Your feedback will help us improve our newsletter"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full"
                rows={4}
              />
              <Button onClick={handleUnsubscribe}>
                Confirm Unsubscribe
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
