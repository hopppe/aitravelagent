-- Update jobs table to split prompt and result into separate columns
ALTER TABLE jobs ADD COLUMN prompt TEXT;
ALTER TABLE jobs ADD COLUMN raw_result TEXT;

-- Migrate existing data if possible
-- This moves the 'prompt' and 'rawContent' from the result JSONB column to their own columns
UPDATE jobs 
SET 
  prompt = result->>'prompt',
  raw_result = result->>'rawContent'
WHERE 
  result IS NOT NULL AND 
  result ? 'prompt' AND 
  result ? 'rawContent';

-- Add comments to columns for better documentation
COMMENT ON COLUMN jobs.prompt IS 'The OpenAI prompt used to generate the itinerary';
COMMENT ON COLUMN jobs.raw_result IS 'The raw response from OpenAI without processing';
COMMENT ON COLUMN jobs.result IS 'The processed and structured result data'; 