import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Edit Invoice',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <section>{children}</section>;
}
