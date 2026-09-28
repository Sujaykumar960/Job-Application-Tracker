import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { RoleType } from '../types';
import { User, Mail, Lock, AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { cn } from '../utils/cn';

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
    role: z.enum(['seeker', 'recruiter']),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export const RegisterPage: React.FC = () => {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      role: 'seeker',
      password: '',
      confirmPassword: '',
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: RegisterFormData) => {
    setAuthError(null);
    try {
      await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role as RoleType,
      });
      navigate('/', { replace: true });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        (Array.isArray(err?.response?.data?.detail)
          ? err.response.data.detail[0]?.msg
          : err?.response?.data?.detail) ||
        err?.message ||
        'Registration failed';
      setAuthError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  };

  return (
    <div className="w-full rounded-2xl bg-white dark:bg-slate-900 border border-[#D9D9D9] dark:border-slate-800 p-6 sm:p-7 shadow-xl space-y-4">
      {/* Title */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-[#1D2226] dark:text-slate-100 tracking-tight">Create your CareerX Account</h1>
        <p className="text-xs text-[#56687A] dark:text-slate-400">
          Join the AI-powered career platform built for modern tech professionals.
        </p>
      </div>

      {/* Error Alert */}
      {authError && (
        <div role="alert" data-testid="auth-error-alert" className="p-3 rounded-xl bg-[#FCE8E6] dark:bg-rose-950/40 border border-[#f8cbc7] dark:border-rose-900/60 text-xs text-[#B3261E] dark:text-rose-400 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-[#B3261E] dark:text-rose-400 flex-shrink-0 mt-0.5" />
          <span className="leading-relaxed">{authError}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3.5">
        {/* Role Picker */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[#1D2226] dark:text-slate-200">I am joining as a:</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setValue('role', 'seeker')}
              className={cn(
                'p-2.5 rounded-xl border text-left transition flex items-center justify-between cursor-pointer',
                selectedRole === 'seeker'
                  ? 'bg-[#E8F3FF] dark:bg-sky-950/40 border-[#0A66C2] dark:border-sky-500 text-[#1D2226] dark:text-slate-100'
                  : 'bg-white dark:bg-slate-800 border-[#D9D9D9] dark:border-slate-700 text-[#56687A] dark:text-slate-300 hover:border-[#0A66C2]/40 dark:hover:border-sky-500/40'
              )}
            >
              <div>
                <p className="text-xs font-bold text-[#1D2226] dark:text-slate-100">Software Engineer</p>
                <p className="text-[10px] text-[#788896] dark:text-slate-400">Job Seeker / Intern</p>
              </div>
              {selectedRole === 'seeker' && <CheckCircle2 className="w-4 h-4 text-[#0A66C2] dark:text-sky-400" />}
            </button>

            <button
              type="button"
              onClick={() => setValue('role', 'recruiter')}
              className={cn(
                'p-2.5 rounded-xl border text-left transition flex items-center justify-between cursor-pointer',
                selectedRole === 'recruiter'
                  ? 'bg-[#E8F3FF] dark:bg-sky-950/40 border-[#0A66C2] dark:border-sky-500 text-[#1D2226] dark:text-slate-100'
                  : 'bg-white dark:bg-slate-800 border-[#D9D9D9] dark:border-slate-700 text-[#56687A] dark:text-slate-300 hover:border-[#0A66C2]/40 dark:hover:border-sky-500/40'
              )}
            >
              <div>
                <p className="text-xs font-bold text-[#1D2226] dark:text-slate-100">Technical Recruiter</p>
                <p className="text-[10px] text-[#788896] dark:text-slate-400">Talent Acquisition</p>
              </div>
              {selectedRole === 'recruiter' && <CheckCircle2 className="w-4 h-4 text-[#0A66C2] dark:text-sky-400" />}
            </button>
          </div>
        </div>

        {/* Full Name */}
        <Input
          label="Full Name"
          placeholder="e.g. Alex Rivera"
          icon={<User className="w-3.5 h-3.5" />}
          error={errors.name?.message}
          {...register('name')}
        />

        {/* Email */}
        <Input
          label="Work or Personal Email"
          type="email"
          placeholder="name@workmail.com"
          icon={<Mail className="w-3.5 h-3.5" />}
          error={errors.email?.message}
          {...register('email')}
        />

        {/* Password */}
        <Input
          label="Password (min 6 characters)"
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

        {/* Confirm Password */}
        <Input
          label="Confirm Password"
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

        {/* Submit */}
        <Button
          type="submit"
          variant="primary"
          size="md"
          className="w-full mt-2"
          loading={isSubmitting}
          icon={<ArrowRight className="w-4 h-4" />}
        >
          Create CareerX Account
        </Button>
      </form>

      {/* Login link */}
      <div className="pt-2 text-center text-xs text-[#56687A] dark:text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-[#0A66C2] dark:text-sky-400 hover:text-[#004182] dark:hover:text-sky-300 transition">
          Sign in
        </Link>
      </div>
    </div>
  );
};

export default RegisterPage;

