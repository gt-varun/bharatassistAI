import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Bookmark, BellRing, ListChecks, Search } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { LanguageSelector } from '../components/ui/LanguageSelector';
import { cn } from '../lib/utils';

type Method = 'otp' | 'password';

const ACCOUNT_ADDS = [
  { icon: Search, key: 'add1' },
  { icon: Bookmark, key: 'add2' },
  { icon: ListChecks, key: 'add3' },
  { icon: BellRing, key: 'add4' }
];

function readableError(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
    ?.error?.message;
  return message || fallback;
}

export const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { requestOtp, signInWithOtp, signInWithPassword } = useAuth();

  // Where the guest was headed before the door. Set by RequireAuth, and by
  // every call to action on the landing page.
  const from = (location.state as { from?: string } | null)?.from || '/dashboard';

  const [method, setMethod] = useState<Method>('otp');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const otpRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  const sendOtp = async () => {
    setError('');
    if (phone.replace(/\D/g, '').length < 10) {
      setError(t('login.errPhone'));
      return;
    }
    setBusy(true);
    try {
      await requestOtp(phone);
      setOtpSent(true);
      setSecondsLeft(30);
      setNotice(t('login.otpSent', { phone }));
      window.setTimeout(() => otpRef.current?.focus(), 60);
    } catch (err) {
      setError(readableError(err, t('login.errSend')));
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (method === 'otp') {
        if (!otpSent) {
          await sendOtp();
          return;
        }
        await signInWithOtp(phone, otp);
      } else {
        await signInWithPassword(email, password);
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        readableError(
          err,
          method === 'otp' ? t('login.errOtp') : t('login.errPassword')
        )
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
      {/* ---- Form side ---- */}
      <div className="flex min-h-screen flex-col px-4 py-6 sm:px-8 lg:px-14">
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/"
            className="flex items-center gap-2.5 rounded outline-none focus-visible:ring-2 focus-visible:ring-sanction/60"
          >
            <span className="grid h-9 w-9 place-items-center rounded-md bg-sanction font-display text-[0.9375rem] font-bold text-white shadow-card">
              BA
            </span>
            <span className="font-display text-[0.9375rem] font-semibold text-ink">
              {t('common.appName')}
            </span>
          </Link>
          <LanguageSelector className="w-[9.5rem]" />
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">
            <p className="register mb-2">{t('login.eyebrow')}</p>
            <h1 className="font-display text-[1.75rem] font-semibold leading-tight tracking-[-0.02em]">
              {t('login.title')}
            </h1>
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-2">{t('login.desc')}</p>

            {/* Method switch */}
            <div className="mt-7 flex gap-1 rounded-md border border-rule bg-surface p-1">
              {(
                [
                  { id: 'otp', label: t('login.tabMobile') },
                  { id: 'password', label: t('login.tabEmail') }
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setMethod(tab.id);
                    setError('');
                    setNotice('');
                  }}
                  className={cn(
                    'flex-1 rounded px-3 py-1.5 text-[0.875rem] font-medium transition-colors',
                    method === tab.id
                      ? 'bg-sanction-tint text-sanction'
                      : 'text-ink-2 hover:bg-rule-soft hover:text-ink'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="mt-5 space-y-4">
              {method === 'otp' ? (
                <>
                  <Input
                    label={t('login.mobileLabel')}
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="98450 00000"
                    disabled={otpSent}
                    hint={otpSent ? undefined : t('login.mobileHint')}
                  />

                  {otpSent && (
                    <div className="animate-rise-in space-y-2">
                      <Input
                        ref={otpRef}
                        label={t('login.otpLabel')}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="······"
                        className="font-mono text-lg tracking-[0.4em]"
                      />
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            setOtpSent(false);
                            setOtp('');
                            setNotice('');
                          }}
                          className="text-[0.8125rem] text-ink-2 underline-offset-4 hover:text-ink hover:underline"
                        >
                          {t('login.changeNumber')}
                        </button>
                        <button
                          type="button"
                          onClick={sendOtp}
                          disabled={secondsLeft > 0 || busy}
                          className="text-[0.8125rem] font-medium text-sanction underline-offset-4 hover:underline disabled:text-ink-4 disabled:no-underline"
                        >
                          {secondsLeft > 0
                            ? t('login.resendIn', { seconds: secondsLeft })
                            : t('login.resend')}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <Input
                    label={t('login.emailLabel')}
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                  <Input
                    label={t('login.passwordLabel')}
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </>
              )}

              {notice && !error && (
                <p className="rounded-md border border-sanction-edge bg-sanction-tint px-3 py-2 text-[0.8125rem] text-sanction">
                  {notice}
                </p>
              )}

              {error && (
                <p
                  role="alert"
                  className="rounded-md border border-seal-edge bg-seal-tint px-3 py-2 text-[0.8125rem] text-seal"
                >
                  {error}
                </p>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {busy
                  ? t('common.working')
                  : method === 'password' || otpSent
                    ? t('common.signIn')
                    : t('login.sendCode')}
                {!busy && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>

            <p className="mt-6 text-[0.8125rem] leading-relaxed text-ink-3">{t('login.privacy')}</p>

            <Link
              to="/"
              className="mt-8 inline-flex items-center gap-1.5 text-[0.875rem] text-ink-2 hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('common.backHome')}
            </Link>
          </div>
        </div>
      </div>

      {/* ---- What an account adds ---- */}
      <aside className="hidden border-l border-rule bg-surface lg:flex lg:flex-col lg:justify-center lg:px-12">
        <p className="register mb-2">{t('login.asideEyebrow')}</p>
        <h2 className="font-display text-xl font-semibold leading-snug tracking-[-0.015em]">
          {t('login.asideTitle')}
        </h2>

        <ul className="mt-8 space-y-6">
          {ACCOUNT_ADDS.map(({ icon: Icon, key }) => (
            <li key={key} className="flex gap-3.5">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md border border-rule bg-surface-sunk text-ink-3">
                <Icon className="h-4 w-4" strokeWidth={1.7} />
              </span>
              <p className="text-[0.9375rem] leading-relaxed text-ink-2">{t(`login.${key}`)}</p>
            </li>
          ))}
        </ul>

        <p className="hair-top mt-10 pt-6 text-[0.8125rem] leading-relaxed text-ink-3">
          {t('login.asideFoot')}
        </p>
      </aside>
    </div>
  );
};
