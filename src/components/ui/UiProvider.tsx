'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react'

/* ============================================================
 * Toast
 * ============================================================ */

type ToastType = 'success' | 'error' | 'info'
type ToastItem = { id: number; msg: string; type: ToastType }

type ToastApi = {
  success: (msg: string) => void
  error: (msg: string) => void
  info: (msg: string) => void
}

const ToastCtx = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast deve ser usado dentro de <UiProvider>')
  return ctx
}

const TOAST_STYLE: Record<ToastType, { bg: string; border: string; color: string; Icon: typeof CheckCircle2 }> = {
  success: { bg: 'var(--success-bg)', border: 'var(--success-border)', color: 'var(--success)', Icon: CheckCircle2 },
  error: { bg: 'var(--danger-bg)', border: 'var(--danger-border)', color: 'var(--danger)', Icon: AlertCircle },
  info: { bg: 'var(--info-bg)', border: 'var(--info-border)', color: 'var(--info)', Icon: Info },
}

function ToastViewport({ items, dismiss }: { items: ToastItem[]; dismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none">
      {items.map(t => {
        const s = TOAST_STYLE[t.type]
        return (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border"
            style={{
              background: s.bg, borderColor: s.border, color: s.color,
              boxShadow: 'var(--shadow-lg)', animation: 'modal-in 0.2s ease-out',
            }}
            role="status"
          >
            <s.Icon size={16} className="flex-shrink-0" />
            <span className="text-sm font-medium flex-1">{t.msg}</span>
            <button onClick={() => dismiss(t.id)} className="opacity-60 hover:opacity-100 transition-opacity" aria-label="Fechar">
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

/* ============================================================
 * ConfirmDialog (promise-based)
 * ============================================================ */

type ConfirmOptions = {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

type ConfirmApi = (opts: ConfirmOptions) => Promise<boolean>

const ConfirmCtx = createContext<ConfirmApi | null>(null)

export function useConfirm(): ConfirmApi {
  const ctx = useContext(ConfirmCtx)
  if (!ctx) throw new Error('useConfirm deve ser usado dentro de <UiProvider>')
  return ctx
}

function ConfirmDialog({
  opts, onResolve,
}: { opts: ConfirmOptions; onResolve: (v: boolean) => void }) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    confirmRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onResolve(false)
      if (e.key === 'Enter') onResolve(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onResolve])

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={() => onResolve(false)}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-6"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-lg)', animation: 'modal-in 0.2s ease-out' }}
        onClick={e => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: opts.danger ? 'var(--danger-bg)' : 'var(--info-bg)',
              color: opts.danger ? 'var(--danger)' : 'var(--info)',
            }}
          >
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base" style={{ color: 'var(--text)' }}>{opts.title}</h3>
            {opts.message && <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{opts.message}</p>}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 mt-6">
          <button onClick={() => onResolve(false)} className="btn-secondary">
            {opts.cancelLabel || 'Cancelar'}
          </button>
          <button
            ref={confirmRef}
            onClick={() => onResolve(true)}
            className={opts.danger ? 'btn-danger' : 'btn-primary'}
          >
            {opts.confirmLabel || 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
 * Provider combinado
 * ============================================================ */

export function UiProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const idRef = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const push = useCallback((msg: string, type: ToastType) => {
    const id = ++idRef.current
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => dismiss(id), 4000)
  }, [dismiss])

  const toastApi: ToastApi = {
    success: useCallback((m: string) => push(m, 'success'), [push]),
    error: useCallback((m: string) => push(m, 'error'), [push]),
    info: useCallback((m: string) => push(m, 'info'), [push]),
  }

  const [confirmState, setConfirmState] = useState<{ opts: ConfirmOptions; resolve: (v: boolean) => void } | null>(null)

  const confirm: ConfirmApi = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>(resolve => {
      setConfirmState({ opts, resolve })
    })
  }, [])

  const resolveConfirm = useCallback((v: boolean) => {
    setConfirmState(prev => {
      prev?.resolve(v)
      return null
    })
  }, [])

  return (
    <ToastCtx.Provider value={toastApi}>
      <ConfirmCtx.Provider value={confirm}>
        {children}
        <ToastViewport items={toasts} dismiss={dismiss} />
        {confirmState && <ConfirmDialog opts={confirmState.opts} onResolve={resolveConfirm} />}
      </ConfirmCtx.Provider>
    </ToastCtx.Provider>
  )
}
