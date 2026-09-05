import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Eye, EyeOff, Lock, Mail, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().min(1, 'Email address is required').email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/';

  const onSubmit = async (data: LoginFormData) => {
    setAuthError(null);
    try {
      await login(data);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials. Please try again.';
      setAuthError(msg);
    }
  };

  // 1-Click Demo Login for immediate evaluation
  const handleQuickDemo = async (role: 'seeker' | 'recruiter') => {
    setAuthError(null);
    const demoEmail = role === 'seeker' ? 'alex.rivera@devmail.io' : 'recruiter@stripe.com';
    setValue('email', demoEmail);
    setValue('password', 'password123');
    try {
      await login({ email: demoEmail, password: 'password123' });
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Demo login failed');
    }
  };

  return (
    <div className="w-full rounded-2xl bg-white border border-[#D9D9D9] p-6 sm:p-7 shadow-xl space-y-5">
      {/* Title */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-[#1D2226] tracking-tight">Sign in to CareerX</h1>
        <p className="text-xs text-[#56687A]">
          Enter your credentials to access your tracking and learning dashboard.
        </p>
      </div>

      {/* Error Alert */}
      {authError && (
        <div className="p-3 rounded-xl bg-[#FCE8E6] border border-[#f8cbc7] text-xs text-[#B3261E] flex items-start gap-2.5 animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 text-[#B3261E] flex-shrink-0 mt-0.5" />
          <span className="leading-relaxed">{authError}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email */}
        <Input
          label="Email Address"
          type="email"
          placeholder="name@workmail.com"
          icon={<Mail className="w-3.5 h-3.5" />}
          error={errors.email?.message}
          {...register('email')}
        />

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-[#1D2226]">Password</label>
            <Link
              to="/forgot-password"
              className="text-[11px] text-[#0A66C2] hover:text-[#004182] transition"
            >
              Forgot password?
            </Link>
          </div>

          <div className="relative rounded-lg">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#788896]">
              <Lock className="w-3.5 h-3.5" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className={`w-full bg-white text-[#1D2226] placeholder-[#788896] text-sm rounded-lg border pl-9 pr-10 py-2 transition focus:outline-none focus:ring-1 focus:ring-[#0A66C2] ${
                errors.password ? 'border-rose-500' : 'border-[#D9D9D9] hover:border-[#0A66C2]/40'
              }`}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#788896] hover:text-[#1D2226]"
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-[#B3261E] font-medium">{errors.password.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="md"
          className="w-full"
          loading={isSubmitting}
          icon={<ArrowRight className="w-4 h-4" />}
        >
          Sign In
        </Button>
      </form>

      {/* Divider */}
      <div className="relative my-3">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#E8E8E8]" />
        </div>
        <div className="relative flex justify-center text-[10px] uppercase font-mono">
          <span className="bg-white px-2 text-[#788896]">Or test with demo account</span>
        </div>
      </div>

      {/* Quick Demo Logins */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => handleQuickDemo('seeker')}
          className="p-2 rounded-xl bg-[#F3F6F8] border border-[#D9D9D9] hover:border-[#0A66C2]/40 text-xs text-[#1D2226] flex items-center justify-center gap-1.5 transition font-semibold"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#0A66C2]" />
          <span>Demo Seeker</span>
        </button>
        <button
          type="button"
          onClick={() => handleQuickDemo('recruiter')}
          className="p-2 rounded-xl bg-[#F3F6F8] border border-[#D9D9D9] hover:border-[#0A66C2]/40 text-xs text-[#1D2226] flex items-center justify-center gap-1.5 transition font-semibold"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Demo Recruiter</span>
        </button>
      </div>

      {/* Link to Register */}
      <div className="pt-2 text-center text-xs text-[#56687A]">
        Don't have an account yet?{' '}
        <Link to="/register" className="font-semibold text-[#0A66C2] hover:text-[#004182] transition">
          Create an account
        </Link>
      </div>
    </div>
  );
};

export default LoginPage;
