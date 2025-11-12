"use client";

import { useState, useCallback } from "react";

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export function useConfirm() {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({
    title: "",
    message: "",
  });
  const [resolvePromise, setResolvePromise] = useState<
    ((value: boolean) => void) | null
  >(null);

  const showConfirm = useCallback(
    (opts: ConfirmOptions): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        setOptions(opts);
        setIsOpen(true);
        setResolvePromise(() => resolve);
      });
    },
    []
  );

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    if (resolvePromise) {
      resolvePromise(true);
      setResolvePromise(null);
    }
  }, [resolvePromise]);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    if (resolvePromise) {
      resolvePromise(false);
      setResolvePromise(null);
    }
  }, [resolvePromise]);

  return {
    isOpen,
    options,
    showConfirm,
    handleConfirm,
    handleCancel,
  };
}

