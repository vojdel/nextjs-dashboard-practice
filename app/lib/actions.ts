'use server';

// ⬆️ solo se puede hacer las peticiones desde el servidor
import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

const CreateInvoiceSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer.',
  }),
  amount: z.coerce
    .number()
    .gt(0, { message: 'Please enter an amount greater than $0.' }),
  status: z.enum(['paid', 'pending'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
  date: z.string(),
});

const CreateInvoiceFormSchema = CreateInvoiceSchema.omit({
  id: true,
  date: true,
});

const UpdateInvoice = CreateInvoiceSchema.omit({ id: true, date: true });

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

/**
 * Creates an invoice based on the provided form data.
 *
 * @param {State} prevState - the previous state of the application
 * @param {FormData} formData - the form data containing invoice details
 * @return {Promise<void>} - a promise that resolves when the invoice is created successfully
 */

export async function createInvoice(prevState: State, formData: FormData) {
  const validatedFields = CreateInvoiceFormSchema.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  // If form validation fails, return errors early. Otherwise, continue.
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    };
  }

  // Prepare data for insertion into the database
  const { customerId, amount, status } = validatedFields.data;
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

  // Revalidate the cache for the invoices page and redirect the user.
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

/**
 * Updates an invoice with the provided data.
 *
 * @param {string} id - the ID of the invoice to be updated
 * @param {State} prevState - the previous state of the application
 * @param {FormData} formData - the data to be updated in the invoice
 * @return {Promise<void>} - a promise that resolves once the update is complete
 */
export async function updateInvoice(
  id: string,
  prevState: State,
  formData: FormData,
) {
  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  // If form validation fails, return errors early. Otherwise, continue.
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Update Invoice.',
    };
  }

  // Prepare data for insertion into the database
  const { customerId, amount, status } = validatedFields.data;
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

/**
 * Authenticates the user with the provided credentials.
 *
 * @param {string | undefined} prevState - The previous state of the authentication process.
 * @param {FormData} formData - The data containing the user's credentials.
 * @return {Promise<void>} - A Promise that resolves when the authentication is successful or rejects with an error.
 */
export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}
