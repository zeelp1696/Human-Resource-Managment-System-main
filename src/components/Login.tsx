import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Users, UserCheck, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { User } from '../types/auth';
import { apiService } from '../utils/api';
import { toast } from 'sonner';

interface LoginProps {
  onLogin: (user: User) => void;
  onShowSignUp?: () => void;
}

export function Login({ onLogin, onShowSignUp }: LoginProps) {
  const [loginType, setLoginType] = useState<'hr' | 'employee'>('hr');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { user } = await apiService.login(email, password);

      // Show toast if user needs to change password
      if (user.needsPasswordChange) {
        toast.info('Welcome! Please change your password in Settings → Security', {
          duration: 6000,
        });
      }

      onLogin(user);
    } catch (error) {
      console.error('Login failed:', error);
      let errorMessage = 'Login failed. Please try again.';

      if (error instanceof Error) {
        if (error.message.includes('User not found')) {
          errorMessage = 'User not found. Please check your email address.';
        } else if (error.message.includes('Invalid credentials')) {
          errorMessage = 'Invalid password. Please try again.';
        } else {
          errorMessage = error.message;
        }
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceInit = async () => {
    setIsInitializing(true);
    setError('');
    setDebugInfo('');

    try {
      const result = await apiService.forceInitialize();
      setDebugInfo(`Reinitialized with ${result.users?.length || 0} users`);
      setError('Server data reinitialized successfully. Please try logging in again.');
    } catch (error) {
      console.error('Initialization failed:', error);
      setError('Failed to initialize server data: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsInitializing(false);
    }
  };

  const handleTestServer = async () => {
    setDebugInfo('Testing server connection...');
    try {
      const result = await apiService.testServer();
      setDebugInfo(`Server test successful: ${result.message}`);
    } catch (error) {
      setDebugInfo(`Server test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Login Form */}
        <Card className="shadow-xl">
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-center">
              <div className="h-12 w-12 bg-primary rounded-lg flex items-center justify-center">
                <Users className="h-7 w-7 text-primary-foreground" />
              </div>
            </div>
            <div className="text-center">
              <CardTitle className="text-2xl">SmartHRMS Login</CardTitle>
              <CardDescription>
                AI-Powered Human Resource Management System
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="loginType">Login Type</Label>
                <Select value={loginType} onValueChange={(value: 'hr' | 'employee') => setLoginType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hr">
                      <div className="flex items-center space-x-2">
                        <UserCheck className="h-4 w-4" />
                        <span>HR Personnel</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="employee">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4" />
                        <span>Employee</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading || isInitializing}>
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  'Sign In'
                )}
              </Button>

              {error && (
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleTestServer}
                    disabled={isInitializing || isLoading}
                  >
                    Test Server Connection
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleForceInit}
                    disabled={isInitializing || isLoading}
                  >
                    {isInitializing ? (
                      <div className="flex items-center space-x-2">
                        <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        <span>Initializing Server...</span>
                      </div>
                    ) : (
                      'Initialize Server Data'
                    )}
                  </Button>
                </div>
              )}

              {debugInfo && (
                <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded mt-2">
                  {debugInfo}
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
