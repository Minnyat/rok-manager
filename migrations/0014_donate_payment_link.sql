-- Add direct payment link support (PayPal, crypto, etc.)
ALTER TABLE donate_methods ADD COLUMN payment_link TEXT;
