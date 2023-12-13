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

/**
 * Creates an invoice based on the provided form data.
 *
 * @param {FormData} formData - The form data containing the details of the invoice.
 * @return {Promise<void>} - A promise that resolves when the invoice is created successfully.
 */

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

  try {
    await sql`
    INSERT INTO invoices (id, customer_id, amount, status, date)
    VALUES (${customerId}, ${customerId}, ${amountInCents}, ${status}, ${date})`;
  } catch (error) {
    return {
      message: 'Database Error: Failed to Create Invoice',
    };
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

/**
 * Updates an invoice with the specified ID using the provided form data.
 *
 * @param {string} id - The ID of the invoice to be updated.
 * @param {FormData} formData - The form data containing the updated invoice information.
 * @return {Promise<void>} - A Promise that resolves when the invoice is successfully updated.
 */
export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  // Transformamos para evitar errores de redondeo
  const amountInCents = amount * 100;

  try {
    await sql`
    UPDATE invoices
    Set customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
    WHERE id = ${id}`;
  } catch (error) {
    return {
      message: 'Database Error: Failed to Update Invoice',
    };
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

/**
 * Deletes an invoice with the specified ID.
 *
 * @param {string} id - The ID of the invoice to be deleted.
 * @return {Promise<void>} - A promise that resolves when the invoice is successfully deleted.
 */
export async function deleteInvoice(id: string) {
  try {
    await sql`DELETE FROM invoices WHERE id = ${id}`;
    revalidatePath('/dashboard/invoices');
    return { message: 'Deleted Invoice.' };
  } catch (error) {
    return { message: 'Database Error: Failed to Delete Invoice.' };
  }
}
