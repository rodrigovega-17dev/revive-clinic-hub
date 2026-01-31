-- Mock Therapists
INSERT INTO public.therapists (id, first_name, last_name, calendar_color_id, clinic_id) VALUES
  ('b3b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a01', 'Rafael', 'Rojas', 1, 'abaf9353-8048-412c-9119-4f873aa2a3c1'),
  ('b3b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a02', 'Cristina', 'Herrera', 2, 'abaf9353-8048-412c-9119-4f873aa2a3c1'),
  ('b3b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a03', 'Eduardo', 'Rivas', 3, 'abaf9353-8048-412c-9119-4f873aa2a3c1'),
  ('b3b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a04', 'Maria', 'Auxiliadora', 4, 'abaf9353-8048-412c-9119-4f873aa2a3c1'),
  ('b3b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a05', 'Rodman', 'Ponce', 5, 'abaf9353-8048-412c-9119-4f873aa2a3c1'),
  ('b3b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a06', 'Adolfo', 'Castaneda', 6, 'abaf9353-8048-412c-9119-4f873aa2a3c1'),
  ('b3b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a07', 'Sofia', 'Diaz', 7, 'abaf9353-8048-412c-9119-4f873aa2a3c1'),
  ('b3b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a08', 'Bruno', 'Newman', 8, 'abaf9353-8048-412c-9119-4f873aa2a3c1'),
  ('b3b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a09', 'Gabriel', 'Khan', 9, 'abaf9353-8048-412c-9119-4f873aa2a3c1'),
  ('b3b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a10', 'Carmen', 'Garcia', 10, 'abaf9353-8048-412c-9119-4f873aa2a3c1');

-- Mock Clients
INSERT INTO public.clients (id, first_name, last_name, clinic_id) VALUES
  ('c1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a01', 'Maria', 'Lopez', 'abaf9353-8048-412c-9119-4f873aa2a3c1'),
  ('c1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a02', 'Jose', 'Martinez', 'abaf9353-8048-412c-9119-4f873aa2a3c1'),
  ('c1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a03', 'Sofia', 'Buzali', 'abaf9353-8048-412c-9119-4f873aa2a3c1'),
  ('c1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a04', 'Armando', 'Alvarez', 'abaf9353-8048-412c-9119-4f873aa2a3c1'),
  ('c1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a05', 'Leticia', 'Paz', 'abaf9353-8048-412c-9119-4f873aa2a3c1'),
  ('c1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a06', 'Domitila', 'Bedel', 'abaf9353-8048-412c-9119-4f873aa2a3c1'),
  ('c1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a07', 'Miguel', 'Calderon', 'abaf9353-8048-412c-9119-4f873aa2a3c1'),
  ('c1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a08', 'Geraldine', 'Najera', 'abaf9353-8048-412c-9119-4f873aa2a3c1'),
  ('c1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a09', 'Monica', 'Scheffler', 'abaf9353-8048-412c-9119-4f873aa2a3c1'),
  ('c1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a10', 'Rocio', 'Hinojosa', 'abaf9353-8048-412c-9119-4f873aa2a3c1'),
  ('c1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a11', 'Kiren', 'Alvarado', 'abaf9353-8048-412c-9119-4f873aa2a3c1'),
  ('c1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a12', 'Rita', 'Alazraki', 'abaf9353-8048-412c-9119-4f873aa2a3c1'),
  ('c1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a13', 'Carolina', 'Ruiz', 'abaf9353-8048-412c-9119-4f873aa2a3c1'),
  ('c1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a14', 'Miguel Angel', 'Regalado', 'abaf9353-8048-412c-9119-4f873aa2a3c1'),
  ('c1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a15', 'Lili', 'Lopez', 'abaf9353-8048-412c-9119-4f873aa2a3c1'),
  ('c1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a16', 'Jacobo', 'Ortiz', 'abaf9353-8048-412c-9119-4f873aa2a3c1'),
  ('c1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a17', 'Jorge', 'Garcia', 'abaf9353-8048-412c-9119-4f873aa2a3c1'),
  ('c1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a18', 'Cecilia', 'Corona', 'abaf9353-8048-412c-9119-4f873aa2a3c1'),
  ('c1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a19', 'Carlos', 'Villar', 'abaf9353-8048-412c-9119-4f873aa2a3c1'),
  ('c1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a20', 'Veronica', 'Sanchez', 'abaf9353-8048-412c-9119-4f873aa2a3c1');

-- Mock Appointments (Monday, June 30, 2025)
INSERT INTO public.appointments (id, client_id, therapist_id, clinic_id, start_time, end_time, status, treatment_id) VALUES
  ('a1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a01', 'c1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a01', 'b3b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a01', 'abaf9353-8048-412c-9119-4f873aa2a3c1', '2025-06-30T08:00:00', '2025-06-30T09:00:00', 'scheduled', NULL),
  ('a1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a02', 'c1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a02', 'b3b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a02', 'abaf9353-8048-412c-9119-4f873aa2a3c1', '2025-06-30T08:00:00', '2025-06-30T09:00:00', 'scheduled', NULL),
  ('a1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a03', 'c1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a03', 'b3b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a03', 'abaf9353-8048-412c-9119-4f873aa2a3c1', '2025-06-30T08:00:00', '2025-06-30T09:00:00', 'scheduled', NULL),
  ('a1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a04', 'c1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a04', 'b3b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a04', 'abaf9353-8048-412c-9119-4f873aa2a3c1', '2025-06-30T09:00:00', '2025-06-30T10:00:00', 'scheduled', NULL),
  ('a1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a05', 'c1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a05', 'b3b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a05', 'abaf9353-8048-412c-9119-4f873aa2a3c1', '2025-06-30T09:00:00', '2025-06-30T10:00:00', 'scheduled', NULL),
  ('a1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a06', 'c1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a06', 'b3b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a06', 'abaf9353-8048-412c-9119-4f873aa2a3c1', '2025-06-30T09:00:00', '2025-06-30T10:00:00', 'scheduled', NULL),
  ('a1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a07', 'c1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a07', 'b3b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a07', 'abaf9353-8048-412c-9119-4f873aa2a3c1', '2025-06-30T10:00:00', '2025-06-30T11:00:00', 'scheduled', NULL),
  ('a1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a08', 'c1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a08', 'b3b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a08', 'abaf9353-8048-412c-9119-4f873aa2a3c1', '2025-06-30T10:00:00', '2025-06-30T11:00:00', 'scheduled', NULL),
  ('a1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a09', 'c1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a09', 'b3b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a09', 'abaf9353-8048-412c-9119-4f873aa2a3c1', '2025-06-30T10:00:00', '2025-06-30T11:00:00', 'scheduled', NULL),
  ('a1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a10', 'c1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a10', 'b3b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a10', 'abaf9353-8048-412c-9119-4f873aa2a3c1', '2025-06-30T11:00:00', '2025-06-30T12:00:00', 'scheduled', NULL),
  ('a1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a11', 'c1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a11', 'b3b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a01', 'abaf9353-8048-412c-9119-4f873aa2a3c1', '2025-06-30T11:00:00', '2025-06-30T12:00:00', 'scheduled', NULL),
  ('a1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a12', 'c1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a12', 'b3b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a02', 'abaf9353-8048-412c-9119-4f873aa2a3c1', '2025-06-30T11:00:00', '2025-06-30T12:00:00', 'scheduled', NULL),
  ('a1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a13', 'c1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a13', 'b3b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a03', 'abaf9353-8048-412c-9119-4f873aa2a3c1', '2025-06-30T12:00:00', '2025-06-30T13:00:00', 'scheduled', NULL),
  ('a1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a14', 'c1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a14', 'b3b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a04', 'abaf9353-8048-412c-9119-4f873aa2a3c1', '2025-06-30T12:00:00', '2025-06-30T13:00:00', 'scheduled', NULL),
  ('a1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a15', 'c1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a15', 'b3b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a05', 'abaf9353-8048-412c-9119-4f873aa2a3c1', '2025-06-30T12:00:00', '2025-06-30T13:00:00', 'scheduled', NULL),
  ('a1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a16', 'c1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a16', 'b3b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a06', 'abaf9353-8048-412c-9119-4f873aa2a3c1', '2025-06-30T13:00:00', '2025-06-30T14:00:00', 'scheduled', NULL),
  ('a1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a17', 'c1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a17', 'b3b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a07', 'abaf9353-8048-412c-9119-4f873aa2a3c1', '2025-06-30T13:00:00', '2025-06-30T14:00:00', 'scheduled', NULL),
  ('a1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a18', 'c1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a18', 'b3b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a08', 'abaf9353-8048-412c-9119-4f873aa2a3c1', '2025-06-30T13:00:00', '2025-06-30T14:00:00', 'scheduled', NULL),
  ('a1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a19', 'c1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a19', 'b3b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a09', 'abaf9353-8048-412c-9119-4f873aa2a3c1', '2025-06-30T14:00:00', '2025-06-30T15:00:00', 'scheduled', NULL),
  ('a1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a20', 'c1b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a20', 'b3b1c7e2-8c2a-4e2a-9b1c-2a8c2a4e2a10', 'abaf9353-8048-412c-9119-4f873aa2a3c1', '2025-06-30T14:00:00', '2025-06-30T15:00:00', 'scheduled', NULL);
-- Add more appointments for other days and more overlaps as needed for your tests. 