'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const { register, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [authLoading, isAuthenticated, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      toast.error('Password must contain at least one uppercase letter (A-Z)');
      return;
    }
    if (!/[0-9]/.test(password)) {
      toast.error('Password must contain at least one number (0-9)');
      return;
    }

    setIsLoading(true);
    try {
      await register(name.trim(), email.trim().toLowerCase(), password);
      toast.success('Account created successfully!');
      router.push('/dashboard');
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        'Registration failed. Please check your database connection.';
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const fields = [
    { label: 'Full Name', value: name, setter: setName, type: 'text', placeholder: 'John Doe' },
    { label: 'Email', value: email, setter: setEmail, type: 'email', placeholder: 'your@email.com' },
    {
      label: 'Password',
      value: password,
      setter: setPassword,
      type: 'password',
      placeholder: 'Min 8 chars, 1 uppercase, 1 number (e.g. Pass123!)',
    },
    {
      label: 'Confirm Password',
      value: confirmPassword,
      setter: setConfirmPassword,
      type: 'password',
      placeholder: '••••••••',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4 shadow-lg">
            <span className="text-white text-2xl font-bold">DS</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">DevSync</h1>
          <p className="text-gray-500 mt-1">Build better with your team</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Create account</h2>
          <p className="text-gray-500 text-sm mb-6">Start collaborating with your team today</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map(({ label, value, setter, type, placeholder }) => (
              <div key={label}>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
                <input
                  type={type}
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  placeholder={placeholder}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm"
                  required
                />
              </div>
            ))}

            <p className="text-xs text-gray-400">
              Password requirements: Minimum 8 characters, at least 1 uppercase letter and 1 number.
            </p>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-3 px-4 rounded-xl transition duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-indigo-600 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
