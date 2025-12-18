import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { apiPost } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";

export const LoginPage: React.FC = () => {
  const { t } = useI18n();
  const { login, user, refresh } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const profile = await login(identifier, password);
      await refresh();
      if (profile.mustChangePassword) {
        setSuccess(t("mustChangePassword"));
        return;
      }
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  };

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    try {
      await apiPost("/api/auth/change-password", {
        currentPassword,
        newPassword
      });
      setSuccess("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to change password");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="space-y-4">
        <h2 className="font-display text-2xl">{t("loginAnywhere")}</h2>
        <form className="space-y-3" onSubmit={handleLogin}>
          <Input
            label={t("phoneOrUsername")}
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
          />
          <Input
            label={t("password")}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          {success && <p className="text-sm text-emerald-400">{success}</p>}
          <Button type="submit" className="w-full">
            {t("login")}
          </Button>
        </form>
      </Card>

      <Card className="space-y-4">
        <h3 className="font-display text-xl">{t("changePassword")}</h3>
        <p className="text-sm text-[var(--text-muted)]">{t("mustChangePassword")}</p>
        <form className="space-y-3" onSubmit={handleChangePassword}>
          <Input
            label={t("currentPassword")}
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
          <Input
            label={t("newPassword")}
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <Input
            label={t("confirmNewPassword")}
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          {success && <p className="text-sm text-emerald-400">{success}</p>}
          <Button type="submit" variant="outline" className="w-full">
            {t("changePassword")}
          </Button>
        </form>
        {user?.mustChangePassword && (
          <p className="text-xs text-[var(--text-muted)]">You have been required to change your password.</p>
        )}
      </Card>
    </div>
  );
};
