'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { CANCEL_REASONS, MAX_CANCEL_NOTE, type CancelReason } from '@/lib/cancel-reasons'

interface CancelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Formatted date the plan actually drops to Free, if known. */
  endsOn: string | null
  busy: boolean
  onConfirm: (feedback?: { reason: CancelReason; note?: string }) => void
}

/**
 * Confirms a cancellation and asks why.
 *
 * Replaces a browser confirm(), which could not show the end date, could not
 * carry a question, and looked nothing like the rest of the app.
 *
 * Answering is optional and deliberately unenforced — the confirm button works
 * with nothing selected, and sends no feedback in that case. Making the reason
 * mandatory would buy worse data (people pick the first option to get out) at
 * the cost of obstructing someone who has already decided to leave.
 *
 * The end date is shown because the single most common cancellation worry is
 * losing access immediately, and here they do not.
 */
export function CancelDialog({
  open,
  onOpenChange,
  endsOn,
  busy,
  onConfirm,
}: CancelDialogProps) {
  // Reset on reopen is the caller's job, via a key — a half-finished answer
  // from a cancellation someone backed out of should not be submitted later by
  // accident. Doing it in an effect here would setState during render.
  const [reason, setReason] = useState<CancelReason | null>(null)
  const [note, setNote] = useState('')

  function confirm() {
    onConfirm(reason ? { reason, note: note.trim() || undefined } : undefined)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel your subscription?</DialogTitle>
          <DialogDescription>
            {endsOn
              ? `You'll keep Pro until ${endsOn}, then move to the Free plan. Nothing is deleted, and you can resume any time before then.`
              : "You'll keep Pro until the end of the billing period you've already paid for, then move to the Free plan. Nothing is deleted."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Why are you leaving?{' '}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <RadioGroup
              value={reason ?? ''}
              onValueChange={(value) => setReason(value as CancelReason)}
              disabled={busy}
            >
              {CANCEL_REASONS.map((r) => (
                <Label
                  key={r.id}
                  className="flex cursor-pointer items-center gap-2.5 text-sm font-normal text-foreground"
                >
                  <RadioGroupItem value={r.id} />
                  {r.label}
                </Label>
              ))}
            </RadioGroup>
          </div>

          {reason && (
            <div className="space-y-2">
              <Label htmlFor="cancel-note" className="text-sm font-medium">
                Anything else?{' '}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="cancel-note"
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, MAX_CANCEL_NOTE))}
                disabled={busy}
                rows={3}
                placeholder="What would have made you stay?"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Never mind
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Cancel subscription
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
