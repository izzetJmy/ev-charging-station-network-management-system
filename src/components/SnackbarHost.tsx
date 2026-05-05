import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Snackbar, { type SnackbarVariant } from "./Snackbar";

type SnackbarLocationState =
  | {
      snackbar?: {
        message: string;
        variant?: SnackbarVariant;
      };
    }
  | null
  | undefined;

export default function SnackbarHost() {
  const location = useLocation();
  const navigate = useNavigate();

  const snackbar = useMemo(() => {
    const state = location.state as SnackbarLocationState;
    return state?.snackbar ?? null;
  }, [location.state]);

  const [active, setActive] = useState<{
    message: string;
    variant: SnackbarVariant;
  } | null>(null);

  useEffect(() => {
    if (!snackbar?.message) {
      return;
    }

    setActive({
      message: snackbar.message,
      variant: snackbar.variant ?? "info",
    });

    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, navigate, snackbar]);

  if (!active) {
    return null;
  }

  return (
    <Snackbar
      message={active.message}
      variant={active.variant}
      onClose={() => setActive(null)}
    />
  );
}

