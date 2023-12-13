'use server';

// ⬆️ solo se puede hacer las peticiones desde el servidor
import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const CreateInvoiceSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum(['paid', 'pending']),
  date: z.string(),
});

const CreateInvoiceFormSchema = CreateInvoiceSchema.omit({
  id: true,
  date: true,
});

const UpdateInvoice = CreateInvoiceSchema.omit({ id: true, date: true });

export async function createInvoice(formData: FormData) {
  const { customerId, amount, status } = CreateInvoiceFormSchema.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  // Transformamos para evitar errores de redondeo
  const amountInCents = amount * 100;
  // creamos la fecha actual
  const [date] = new Date().toISOString().split('T');

  await sql`
  INSERT INTO invoices (id, customer_id, amount, status, date)
  VALUES (${customerId}, ${customerId}, ${amountInCents}, ${status}, ${date})`;

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  // Transformamos para evitar errores de redondeo
  const amountInCents = amount * 100;

  await sql`
  UPDATE invoices
  Set customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
  WHERE id = ${id}`;

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}
