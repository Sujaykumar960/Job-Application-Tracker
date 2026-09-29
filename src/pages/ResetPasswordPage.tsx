import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Lock, CheckCircle2, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Please confirm your new password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordData = z.infer<typeof resetPasswordSchema>;

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordData) => {
    setErrorMsg(null);
    if (!token) {
      setErrorMsg('Invalid or missing password reset token. Please request a new link from the forgot password page.');
      return;
    }
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
    <div className="w-full rounded-2xl bg-white dark:bg-slate-900 border border-[#D9D9D9] dark:border-slate-800 p-6 sm:p-7 shadow-xl space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-[#1D2226] dark:text-slate-100 tracking-tight">Set New Password</h1>
        <p className="text-xs text-[#56687A] dark:text-slate-400">
          Enter and confirm your new secure password.
        </p>
      </div>

      {success ? (
        <div className="p-4 rounded-xl bg-[#E6F4EA] dark:bg-emerald-950/40 border border-[#c6ecd2] dark:border-emerald-800/60 space-y-2 text-center">
          <CheckCircle2 className="w-6 h-6 text-emerald-700 dark:text-emerald-400 mx-auto" />
          <h4 className="text-sm font-bold text-[#1D2226] dark:text-slate-100">Password Successfully Updated</h4>
          <p className="text-xs text-[#38434F] dark:text-slate-300">
            Redirecting to sign in screen...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-[#FCE8E6] dark:bg-rose-950/40 border border-[#f8cbc7] dark:border-rose-900/60 text-xs text-[#B3261E] dark:text-rose-400 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#B3261E] dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <Input
            label="New Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            icon={<Lock className="w-3.5 h-3.5" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[#788896] hover:text-[#1D2226] dark:hover:text-[#F8FAFC] transition cursor-pointer"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
            error={errors.password?.message}
            {...register('password')}
          />

          <Input
            label="Confirm New Password"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="••••••••"
            icon={<Lock className="w-3.5 h-3.5" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="text-[#788896] hover:text-[#1D2226] dark:hover:text-[#F8FAFC] transition cursor-pointer"
                tabIndex={-1}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          <Button type="submit" variant="primary" size="md" className="w-full" loading={isSubmitting}>
            Save New Password
          </Button>
        </form>
      )}

      <div className="pt-2 text-center text-xs text-[#56687A] dark:text-slate-400">
        <Link to="/login" className="hover:text-[#1D2226] dark:hover:text-slate-200 transition">
          Return to Sign In
        </Link>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
