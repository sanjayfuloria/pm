insert into app_users (username)
values ('user')
on conflict (username) do nothing;

insert into boards (user_id, title, state)
select u.id, 'Kanban Studio',
  jsonb_build_object(
    'columns', jsonb_build_array(
      jsonb_build_object('id', 'col-backlog', 'title', 'Backlog', 'cardIds', jsonb_build_array('card-1', 'card-2')),
      jsonb_build_object('id', 'col-discovery', 'title', 'Discovery', 'cardIds', jsonb_build_array('card-3')),
      jsonb_build_object('id', 'col-progress', 'title', 'In Progress', 'cardIds', jsonb_build_array('card-4', 'card-5')),
      jsonb_build_object('id', 'col-review', 'title', 'Review', 'cardIds', jsonb_build_array('card-6')),
      jsonb_build_object('id', 'col-done', 'title', 'Done', 'cardIds', jsonb_build_array('card-7', 'card-8'))
    ),
    'cards', jsonb_build_object(
      'card-1', jsonb_build_object('id', 'card-1', 'title', 'Align roadmap themes', 'details', 'Draft quarterly themes with impact statements and metrics.'),
      'card-2', jsonb_build_object('id', 'card-2', 'title', 'Gather customer signals', 'details', 'Review support tags, sales notes, and churn feedback.'),
      'card-3', jsonb_build_object('id', 'card-3', 'title', 'Prototype analytics view', 'details', 'Sketch initial dashboard layout and key drill-downs.'),
      'card-4', jsonb_build_object('id', 'card-4', 'title', 'Refine status language', 'details', 'Standardize column labels and tone across the board.'),
      'card-5', jsonb_build_object('id', 'card-5', 'title', 'Design card layout', 'details', 'Add hierarchy and spacing for scanning dense lists.'),
      'card-6', jsonb_build_object('id', 'card-6', 'title', 'QA micro-interactions', 'details', 'Verify hover, focus, and loading states.'),
      'card-7', jsonb_build_object('id', 'card-7', 'title', 'Ship marketing page', 'details', 'Final copy approved and asset pack delivered.'),
      'card-8', jsonb_build_object('id', 'card-8', 'title', 'Close onboarding sprint', 'details', 'Document release notes and share internally.')
    )
  )
from app_users u
where u.username = 'user'
on conflict (user_id) do nothing;
