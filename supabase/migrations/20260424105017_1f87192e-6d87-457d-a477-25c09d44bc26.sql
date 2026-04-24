-- Add mode column to conversations to separate Aika and AikaUnbound chat histories
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'aika';

-- Optional check for known values via trigger (avoid CHECK constraint immutability concerns is fine here, but a simple CHECK is safe for static enums)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'conversations_mode_check'
  ) THEN
    ALTER TABLE public.conversations
    ADD CONSTRAINT conversations_mode_check CHECK (mode IN ('aika', 'unbound'));
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS conversations_user_mode_idx ON public.conversations(user_id, mode);