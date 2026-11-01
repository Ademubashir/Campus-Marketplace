// The admin roles, for the pickers. The server decides what each role can do
// (backend/permissions.py); these descriptions only explain it to the person choosing.
export const ROLE_OPTIONS = [
  {
    value: 'super_admin',
    label: 'Super admin',
    description: 'Everything, including managing admins and the activity log.',
  },
  {
    value: 'moderator',
    label: 'Moderator',
    description: 'Looks after what is for sale: reviews and deletes listings, manages categories.',
  },
  {
    value: 'support',
    label: 'Support',
    description: 'Looks after students: views students and listings, suspends and reinstates students.',
  },
]
