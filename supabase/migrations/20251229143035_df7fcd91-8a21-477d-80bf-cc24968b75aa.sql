-- Enable realtime for org_seats table
ALTER TABLE org_seats REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE org_seats;