import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function AdminLogin() {
  const router = useRouter();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  async function handleSendOtp() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setStep('otp');
        setCountdown(60);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  }

  async function handleVerifyOtp() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push('/admin');
      } else {
        setError(data.error || 'Invalid OTP. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  }

  return (
    <>
      <Head>
        <title>Admin Login — PayrollTool</title>
      </Head>
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f9fafb',
        fontFamily: 'sans-serif',
      }}>
        <div style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '36px 40px',
          width: '100%',
          maxWidth: '380px',
        }}>
          <div style={{ marginBottom: '28px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: '#ecfdf5',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              marginBottom: '16px',
            }}>
              🔐
            </div>
            <h1 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 4px' }}>
              Admin access
            </h1>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
              payrolltool.in/admin
            </p>
          </div>

          {step === 'email' && (
            <div>
              <label style={{ fontSize: '13px', color: '#374151', display: 'block', marginBottom: '6px' }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                placeholder="your@email.com"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  marginBottom: '16px',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
              {error && (
                <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '12px' }}>
                  {error}
                </p>
              )}
              <button
                onClick={handleSendOtp}
                disabled={loading || !email}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: loading || !email ? '#9ca3af' : '#059669',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: loading || !email ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </div>
          )}

          {step === 'otp' && (
            <div>
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
                A 6-digit code was sent to <strong>{email}</strong>
              </p>
              <label style={{ fontSize: '13px', color: '#374151', display: 'block', marginBottom: '6px' }}>
                Enter OTP
              </label>
              <input
                type="text"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()}
                placeholder="000000"
                autoFocus
                maxLength={6}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '20px',
                  letterSpacing: '8px',
                  marginBottom: '16px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  textAlign: 'center',
                }}
              />
              {error && (
                <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '12px' }}>
                  {error}
                </p>
              )}
              <button
                onClick={handleVerifyOtp}
                disabled={loading || otp.length !== 6}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: loading || otp.length !== 6 ? '#9ca3af' : '#059669',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: loading || otp.length !== 6 ? 'not-allowed' : 'pointer',
                  marginBottom: '12px',
                }}
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
              <div style={{ textAlign: 'center' }}>
                {countdown > 0 ? (
                  <p style={{ fontSize: '13px', color: '#6b7280' }}>
                    Resend in {countdown}s
                  </p>
                ) : (
                  <button
                    onClick={() => { handleSendOtp(); setOtp(''); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#059669',
                      fontSize: '13px',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Resend OTP
                  </button>
                )}
              </div>
              <button
                onClick={() => { setStep('email'); setError(''); setOtp(''); }}
                style={{
                  width: '100%',
                  marginTop: '8px',
                  background: 'none',
                  border: 'none',
                  color: '#6b7280',
                  fontSize: '13px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Use a different email
              </button>
            </div>
          )}

          <p style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center', marginTop: '24px', marginBottom: 0 }}>
            Session expires after 24 hours
          </p>
        </div>
      </div>
    </>
  );
}