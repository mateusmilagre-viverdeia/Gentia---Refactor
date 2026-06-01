import { toast } from "sonner";
import { getTranslatedErrorMessage } from "@/utils/translateAuthError";

export function showErrorToast(error: unknown, fallbackMessage = "Não foi possível concluir a ação. Tente novamente em instantes.") {
  toast.error(getTranslatedErrorMessage(error, fallbackMessage));
}

export { getTranslatedErrorMessage };