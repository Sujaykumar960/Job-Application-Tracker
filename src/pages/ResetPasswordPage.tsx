import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/auth';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Lock, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Please confirm your new password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordData = z.infer<typeof resetPasswordSchema>;

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || 'demo_token';
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordData) => {
    setErrorMsg(null);
    try {
      await authApi.resetPassword(token, data.password);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Password reset failed');
    }
  };

  return (
    <div className="w-full rounded-2xl bg-white border border-[#D9D9D9] p-6 sm:p-7 shadow-xl space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-[#1D2226] tracking-tight">Set New Password</h1>
        <p className="text-xs text-[#56687A]">
          Enter and confirm your new secure password.
        </p>
      </div>

      {success ? (
        <div className="p-4 rounded-xl bg-[#E6F4EA] border border-[#c6ecd2] space-y-2 text-center">
          <CheckCircle2 className="w-6 h-6 text-emerald-700 mx-auto" />
          <h4 className="text-sm font-bold text-[#1D2226]">Password Successfully Updated</h4>
          <p className="text-xs text-[#38434F]">
            Redirecting to sign in screen...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-[#FCE8E6] border border-[#f8cbc7] text-xs text-[#B3261E] flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#B3261E] flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <Input
            label="New Password"
            type="password"
            placeholder="••••••••"
            icon={<Lock className="w-3.5 h-3.5" />}
            error={errors.password?.message}
            {...register('password')}
          />

          <Input
            label="Confirm New Password"
            type="password"
            placeholder="••••••••"
            icon={<Lock className="w-3.5 h-3.5" />}
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          <Button type="submit" variant="primary" size="md" className="w-full" loading={isSubmitting}>
            Save New Password
          </Button>
        </form>
      )}

      <div className="pt-2 text-center text-xs text-[#56687A]">
        <Link to="/login" className="hover:text-[#1D2226] transition">
          Return to Sign In
        </Link>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
