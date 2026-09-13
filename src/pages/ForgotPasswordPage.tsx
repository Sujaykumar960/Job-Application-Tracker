import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link } from 'react-router-dom';
import { authApi } from '../api/auth';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
});

type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;

export const ForgotPasswordPage: React.FC = () => {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordData) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await authApi.forgotPassword(data.email);
      setSuccessMessage(res.message);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to dispatch reset link');
    }
  };

  return (
    <div className="w-full rounded-2xl bg-white border border-[#D9D9D9] p-6 sm:p-7 shadow-xl space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-[#1D2226] tracking-tight">Reset Password</h1>
        <p className="text-xs text-[#56687A]">
          Enter your account email to receive instructions to reset your password.
        </p>
      </div>

      {successMessage ? (
        <div className="p-4 rounded-xl bg-[#E6F4EA] border border-[#c6ecd2] space-y-2">
          <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Reset Instructions Dispatched</span>
          </div>
          <p className="text-xs text-[#38434F] leading-relaxed">{successMessage}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-[#FCE8E6] border border-[#f8cbc7] text-xs text-[#B3261E] flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#B3261E] flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <Input
            label="Account Email Address"
            type="email"
            placeholder="alex.rivera@devmail.io"
            icon={<Mail className="w-3.5 h-3.5" />}
            error={errors.email?.message}
            {...register('email')}
          />

          <Button type="submit" variant="primary" size="md" className="w-full" loading={isSubmitting}>
            Send Reset Instructions
          </Button>
        </form>
      )}

      <div className="pt-2 text-center">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs text-[#56687A] hover:text-[#1D2226] transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </Link>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
