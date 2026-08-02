import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { apiClient, setAuthTokens } from '../api/client';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

const phoneSchema = z.object({
  phone: z.string().min(10, 'Enter valid 10-digit phone number')
});

const otpSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits')
});

export const AuthPage: React.FC = () => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const phoneForm = useForm<{ phone: string }>({
    resolver: zodResolver(phoneSchema)
  });

  const otpForm = useForm<{ otp: string }>({
    resolver: zodResolver(otpSchema)
  });

  const onSendOtp = async (data: { phone: string }) => {
    try {
      setErrorMsg('');
      await apiClient.post('/auth/send-otp', { phone: data.phone });
      setPhone(data.phone);
      setStep('otp');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to send OTP');
    }
  };

  const onVerifyOtp = async (data: { otp: string }) => {
    try {
      setErrorMsg('');
      const res = await apiClient.post('/auth/verify-otp', { phone, otp: data.otp });
      if (res.data?.success) {
        setAuthTokens(res.data.data.accessToken, res.data.data.refreshToken);
        navigate('/search');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Invalid OTP');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-2 text-center">Citizen Login</h2>
        <p className="text-sm text-gray-400 text-center mb-6">Enter your phone number to receive a one-time passcode.</p>

        {errorMsg && (
          <div className="p-3 mb-4 text-xs font-semibold text-red-300 bg-red-900/30 border border-red-500/30 rounded">
            {errorMsg}
          </div>
        )}

        {step === 'phone' ? (
          <form onSubmit={phoneForm.handleSubmit(onSendOtp)} className="space-y-4">
            <Input
              label="Phone Number"
              placeholder="e.g. 9876543210"
              error={phoneForm.formState.errors.phone?.message}
              {...phoneForm.register('phone')}
            />
            <Button type="submit" variant="primary" className="w-full">
              Send OTP
            </Button>
          </form>
        ) : (
          <form onSubmit={otpForm.handleSubmit(onVerifyOtp)} className="space-y-4">
            <p className="text-xs text-amber-400 font-medium">OTP sent to {phone} (Default Dev OTP: 123456)</p>
            <Input
              label="6-Digit OTP"
              placeholder="123456"
              error={otpForm.formState.errors.otp?.message}
              {...otpForm.register('otp')}
            />
            <Button type="submit" variant="primary" className="w-full">
              Verify & Sign In
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};
