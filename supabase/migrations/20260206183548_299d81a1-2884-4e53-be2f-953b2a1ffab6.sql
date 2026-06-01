
ALTER TABLE pulse_daily_assignment_items
  DROP CONSTRAINT fk_culture_question;

ALTER TABLE pulse_daily_assignment_items
  ADD CONSTRAINT fk_culture_question
  FOREIGN KEY (culture_question_id)
  REFERENCES pulse_culture_questions(id)
  ON DELETE SET NULL;
