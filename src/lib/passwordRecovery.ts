export const RECOVERY_SESSION_FLAG = "gentia_password_recovery_session";

export const PASSWORD_RECOVERY_PATH = "/auth/redefinir-senha";

export const markPasswordRecoverySession = () => {
  sessionStorage.setItem(RECOVERY_SESSION_FLAG, String(Date.now()));
};

export const clearPasswordRecoverySession = () => {
  sessionStorage.removeItem(RECOVERY_SESSION_FLAG);
};

export const isPasswordRecoverySession = () => {
  return sessionStorage.getItem(RECOVERY_SESSION_FLAG) !== null;
};

export const hasPasswordRecoveryUrlParams = () => {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const queryParams = new URLSearchParams(window.location.search);
  const isRecoveryPath = window.location.pathname === PASSWORD_RECOVERY_PATH;

  return (
    hashParams.get("type") === "recovery" ||
    queryParams.get("type") === "recovery" ||
    hashParams.has("access_token") ||
    hashParams.has("refresh_token") ||
    (isRecoveryPath && queryParams.has("code"))
  );
};