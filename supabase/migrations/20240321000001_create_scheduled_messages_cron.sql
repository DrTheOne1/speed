-- Create the cron job to process scheduled messages
SELECT cron.schedule(
  'process-scheduled-messages',  -- job name
  '* * * * *',                  -- every minute
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.edge_function_url') || '/process-scheduled-messages',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'
    ) AS request_id;
  $$
); 