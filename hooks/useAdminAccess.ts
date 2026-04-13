import { useAuth } from '../context/AuthContext'; // adjust import to your auth context

const ADMIN_EMAILS = [
  'devjroy@gmail.com',
  'swati@thedreamwedding.in',
  'thedreamwedding.app@gmail.com',
];

export function useAdminAccess() {
  const { user } = useAuth();
  return ADMIN_EMAILS.includes(user?.email ?? '');
}
