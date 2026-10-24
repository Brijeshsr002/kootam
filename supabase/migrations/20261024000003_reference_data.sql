-- Reference data needed in every environment (not demo data).
-- Values are founder decisions; change them via admin settings, not code.

insert into public.cities (name, slug, state) values
  ('Coimbatore', 'coimbatore', 'Tamil Nadu'),
  ('Bengaluru',  'bengaluru',  'Karnataka'),
  ('Chennai',    'chennai',    'Tamil Nadu');

insert into public.categories (name, slug, description, sort_order) values
  ('Running',              'running',    'Run clubs, long runs, couch-to-5K groups',  10),
  ('Pickleball & Racquet', 'pickleball', 'Pickleball, badminton, tennis, padel',       20),
  ('Football & Turf',      'turf',       'Turf games and five-a-side',                 30),
  ('Cycling',              'cycling',    'Group rides and cycling clubs',              40),
  ('Trekking & Outdoors',  'outdoors',   'Treks, hikes, camping',                      50),
  ('Fitness',              'fitness',    'Bootcamps, yoga, calisthenics',              60),
  ('Social & Hobby',       'social',     'Book clubs, cafe socials, board games',      70),
  ('Workshops',            'workshops',  'Hands-on classes and skill sessions',        80);

-- Money values in paise. Percentages are plain percentages (4 = 4%).
-- The platform fee is added on top of the ticket price and paid by the attendee.
insert into public.platform_settings (key, value) values
  ('platform_fee_percentage',       '4'),
  ('platform_fee_min_paise',        '500'),
  ('currency',                      '"INR"'),
  ('default_timezone',              '"Asia/Kolkata"'),
  ('payment_hold_minutes',          '15'),
  ('waitlist_offer_minutes',        '120'),
  ('attendee_cancel_cutoff_minutes', '180');
