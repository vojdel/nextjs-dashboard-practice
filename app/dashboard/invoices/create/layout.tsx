import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'New Invoice',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <section>{children}</section>;
}
