import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error(t('resetPassword.errors.passwordMismatch'));
      return;
    }

    if (password.length < 8) {
      toast.error(t('resetPassword.errors.passwordTooShort'));
      return;
    }

    const token = searchParams.get('token');
    if (!token) {
      toast.error(t('resetPassword.errors.invalidToken'));
      return;
    }

    setLoading(true);
    try {
      await resetPassword(password, token);
      toast.success(t('resetPassword.success'));
      navigate('/login');
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error(t('resetPassword.errors.resetFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light p-4">
      <div className="w-100" style={{ maxWidth: '400px' }}>
        <div className="text-center mb-4">
          <div className="d-flex justify-content-center mb-3">
            <Lock className="text-primary" size={48} />
          </div>
          <h2 className="h3 fw-bold text-dark mb-2">
            {t('resetPassword.title')}
          </h2>
          <p className="text-muted">
            {t('resetPassword.description')}
          </p>
        </div>

        <div className="card shadow-sm">
          <div className="card-body p-4">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="password" className="form-label">
                  {t('resetPassword.newPassword')}
                </label>
                <input
                  type="password"
                  id="password"
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              <div className="mb-4">
                <label htmlFor="confirmPassword" className="form-label">
                  {t('resetPassword.confirmPassword')}
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  className="form-control"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                    {t('resetPassword.resetting')}
                  </>
                ) : (
                  t('resetPassword.submit')
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 