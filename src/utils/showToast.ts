import { useState } from "react";
// show temporary toast on protected actions
export type ShowToast = (msg: string) => void;

export function useToast(duration=3500) {
    const [toast, setToast] = useState<string | null>(null);

    function showToast(msg: string) {
        setToast(msg);
        setTimeout(() => setToast(null), duration);
    }

    return [toast, showToast] as const;
}